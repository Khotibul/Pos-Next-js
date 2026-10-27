using System.Globalization;
using System.Windows;
using PosquDesktop.Models;

namespace PosquDesktop.Services;

public sealed class AppServices
{
    public static AppServices Current { get; private set; } = null!;

    public SessionStore Store { get; }
    public ApiClient Api { get; }
    public StoredSession? Session { get; private set; }
    public TenantResponse? Tenant { get; private set; }
    public string? PlanSlug => Tenant?.Plan?.Slug;

    public OfflineStore? Offline { get; private set; }
    public OfflineSyncService? Sync { get; private set; }
    public bool IsOnline => !Api.IsOffline;
    public int PendingSyncCount => Sync?.PendingCount ?? 0;
    public int FailedSyncCount => Sync?.FailedCount ?? 0;
    public bool IsSyncing => Sync?.IsSyncing ?? false;
    public DateTime? LastSyncAt => Sync?.LastSyncAt;
    public string? SyncError => Sync?.LastError;

    public event Action? StateChanged;

    private CancellationTokenSource? _syncLoopCts;

    private AppServices(SessionStore store)
    {
        Store = store;
        Api = new ApiClient(store.Settings.ApiBaseUrl);
        if (store.Session != null)
        {
            Session = store.Session;
            Api.Token = store.Session.Token;
        }

        AttachOffline();
        Api.ConnectivityChanged += OnConnectivityChanged;
    }

    private void AttachOffline()
    {
        var scope = Session?.User.TenantId;
        if (string.IsNullOrWhiteSpace(scope)) scope = "shared";
        Offline = new OfflineStore(Store.DataDirectory, scope);
        Api.UseOfflineStore(Offline);
        Sync = new OfflineSyncService(Api, Offline);
        Sync.StatusChanged += () => StateChanged?.Invoke();
        StartSyncLoop();
    }

    private void OnConnectivityChanged()
    {
        StateChanged?.Invoke();
        if (IsOnline && IsLoggedIn)
            _ = SyncNowAsync();
    }

    private void StartSyncLoop()
    {
        StopSyncLoop();
        if (!IsLoggedIn) return;
        _syncLoopCts = new CancellationTokenSource();
        var token = _syncLoopCts.Token;
        _ = Task.Run(async () =>
        {
            while (!token.IsCancellationRequested)
            {
                try
                {
                    await Task.Delay(TimeSpan.FromSeconds(30), token);
                    if (!IsLoggedIn) continue;
                    if (PendingSyncCount > 0)
                        await SyncNowAsync(token);
                    else if (Api.IsOffline)
                        await RefreshConnectivityAsync(token);
                }
                catch (OperationCanceledException)
                {
                    break;
                }
                catch
                {
                    // loop sinkronisasi tidak boleh menghentikan aplikasi
                }
            }
        }, token);
    }

    private void StopSyncLoop()
    {
        try
        {
            _syncLoopCts?.Cancel();
            _syncLoopCts?.Dispose();
        }
        catch
        {
            // abaikan
        }
        _syncLoopCts = null;
    }

    public async Task<bool> SyncNowAsync(CancellationToken ct = default)
    {
        if (Sync == null || !IsLoggedIn) return false;
        var ok = await Sync.FlushAsync(ct);
        StateChanged?.Invoke();
        return ok;
    }

    public async Task RefreshConnectivityAsync(CancellationToken ct = default)
    {
        if (!IsLoggedIn) return;
        try
        {
            var tenant = await Api.GetTenantAsync(ct);
            if (tenant != null) Tenant = tenant;
            StateChanged?.Invoke();
        }
        catch (ApiException)
        {
            StateChanged?.Invoke();
        }
    }

    public void NotifySyncStatus() => StateChanged?.Invoke();

    public static AppServices Initialize()
    {
        Current = new AppServices(new SessionStore());
        return Current;
    }

    public bool IsLoggedIn => Session != null && !string.IsNullOrWhiteSpace(Session.Token);

    public UserInfo User => Session?.User ?? new UserInfo();

    public string TenantName =>
        Tenant?.Tenant?.Name ?? Session?.User.TenantName ?? "POSQU Pro";

    public string PlanLabel
    {
        get
        {
            var plan = Tenant?.Plan?.Slug ?? "starter";
            return plan.ToUpperInvariant() switch
            {
                "PRO" => "Pro",
                "ENTERPRISE" => "Enterprise",
                "STARTER" => "Starter",
                _ => char.ToUpperInvariant(plan[0]) + plan[1..]
            };
        }
    }

    public bool IsOwnerOrAdmin
    {
        get
        {
            var role = User.Role.ToUpperInvariant();
            return role is "OWNER" or "ADMIN" or "SUPER_ADMIN";
        }
    }

    public void SignIn(StoredSession session, TenantResponse? tenant, bool rememberSession)
    {
        Session = session;
        Tenant = tenant;
        Api.Token = session.Token;
        Api.SetBaseUrl(Store.Settings.ApiBaseUrl);
        if (rememberSession) Store.SaveSession(session);
        AttachOffline();
        StateChanged?.Invoke();
    }

    public void UpdateTenant(TenantResponse? tenant)
    {
        Tenant = tenant;
        StateChanged?.Invoke();
    }

    public void SignOut(bool showMessage = false)
    {
        StopSyncLoop();
        Store.ClearSession();
        Session = null;
        Tenant = null;
        Api.Token = null;
        StateChanged?.Invoke();
        if (showMessage)
            MessageBox.Show("Sesi berakhir. Silakan login kembali.", "POSQU Desktop",
                MessageBoxButton.OK, MessageBoxImage.Information);
    }
}

public static class Formatters
{
    public static string Rupiah(decimal value) => "Rp " + value.ToString("N0");

    public static string Number(decimal value) =>
        value == Math.Truncate(value) ? value.ToString("N0") : value.ToString("N2");

    public static string DateShort(DateTime value) => value.ToString("dd/MM/yyyy");

    public static string DateTimeShort(DateTime value) => value.ToString("dd/MM/yyyy HH:mm");

    public static decimal ParseMoney(string? text)
    {
        var value = (text ?? "").Trim().Replace("Rp", "", StringComparison.OrdinalIgnoreCase).Replace(" ", "");
        if (string.IsNullOrEmpty(value)) return 0;
        if (value.Contains(','))
        {
            value = value.Replace(".", "").Replace(',', '.');
        }
        else
        {
            var parts = value.Split('.');
            if (parts.Length > 1 && parts[^1].Length == 3)
                value = value.Replace(".", "");
        }
        return decimal.TryParse(value, NumberStyles.Any, CultureInfo.InvariantCulture, out var result) ? result : 0;
    }
}


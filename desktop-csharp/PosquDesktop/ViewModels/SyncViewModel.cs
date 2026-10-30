using System.Collections.ObjectModel;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using PosquDesktop.Services;

namespace PosquDesktop.ViewModels;

public partial class SyncStep : ObservableObject
{
    public required string Name { get; init; }
    [ObservableProperty] private string status = "Menunggu";
    [ObservableProperty] private string detail = "";
}

public partial class SyncViewModel : ViewModelBase
{
    private readonly AppServices _services;

    [ObservableProperty] private string lastSyncLabel = "Belum pernah sinkron pada sesi ini";
    [ObservableProperty] private string progressMessage = "";
    [ObservableProperty] private string datasetInfo = "";

    public ObservableCollection<SyncStep> Steps { get; } = new();
    public string TenantName => _services.TenantName;
    public string ApiUrl => _services.Api.BaseUrl;
    public bool IsOnline => _services.IsOnline;
    public string ConnectionLabel => IsOnline ? "Online" : "Offline";
    public string ConnectionHint => IsOnline
        ? "Server dapat dijangkau. Data baru akan dikirim otomatis."
        : "Tidak ada koneksi. Transaksi tetap tersimpan di perangkat.";
    public int PendingCount => _services.PendingSyncCount;
    public int FailedCount => _services.FailedSyncCount;
    public bool HasFailed => FailedCount > 0;
    public string QueueLabel => (PendingCount, FailedCount) switch
    {
        (0, 0) => "Tidak ada data menunggu",
        (0, _) => $"{FailedCount} data ditolak server",
        (_, 0) => $"{PendingCount} data menunggu dikirim",
        _ => $"{PendingCount} menunggu, {FailedCount} ditolak"
    };
    public string CachedInfo => _services.Offline?.DirectoryPath ?? "-";

    public SyncViewModel(AppServices services)
    {
        _services = services;
        // Waktu sinkron terakhir tersimpan di database lokal, jadi tetap tampil
        // benar setelah aplikasi ditutup dan dibuka kembali.
        LastSyncLabel = services.LastSyncAt is { } last
            ? $"Terakhir sinkron {last:dd/MM/yyyy HH:mm:ss}"
            : "Belum pernah sinkron pada perangkat ini";
        ResetSteps();
    }

    private void ResetSteps()
    {
        Steps.Clear();
        foreach (var name in OfflineSyncService.StepNames)
        {
            Steps.Add(new SyncStep { Name = name });
        }
    }

    public override Task LoadAsync()
    {
        DatasetInfo = $"{_services.Store.Settings.ApiBaseUrl} · {_services.TenantName}";
        return Task.CompletedTask;
    }

    private void NotifyStatusChanged()
    {
        OnPropertyChanged(nameof(IsOnline));
        OnPropertyChanged(nameof(ConnectionLabel));
        OnPropertyChanged(nameof(ConnectionHint));
        OnPropertyChanged(nameof(PendingCount));
        OnPropertyChanged(nameof(FailedCount));
        OnPropertyChanged(nameof(HasFailed));
        OnPropertyChanged(nameof(QueueLabel));
        OnPropertyChanged(nameof(CachedInfo));
    }

    [RelayCommand]
    private async Task RetryFailedAsync()
    {
        var store = _services.Offline;
        if (store == null || !HasFailed) return;
        if (!_services.IsOnline)
        {
            ErrorMessage = "Sambungkan internet terlebih dahulu untuk mencoba mengirim ulang data yang ditolak.";
            return;
        }

        var count = store.RetryFailed();
        if (count == 0) return;
        await _services.SyncNowAsync();
        NotifyStatusChanged();
        StatusMessage = $"{count} data dimasukkan kembali ke antrean sinkronisasi.";
    }

    [RelayCommand]
    private async Task SyncAsync()
    {
        if (IsBusy) return;
        NotifyStatusChanged();
        if (!_services.IsOnline)
        {
            ErrorMessage = "Tidak dapat memuat data baru saat offline. Periksa koneksi internet lalu coba lagi.";
            return;
        }
        var sync = _services.Sync;
        if (sync == null) return;

        ResetSteps();
        LastSyncLabel = "Sinkronisasi berjalan…";

        await RunAsync(async () =>
        {
            if (_services.PendingSyncCount > 0)
            {
                await _services.SyncNowAsync();
                if (_services.PendingSyncCount > 0)
                    throw new ApiException($"{_services.PendingSyncCount} data offline belum dapat dikirim. Coba lagi nanti.");
                NotifyStatusChanged();
            }

            // Penarikan memparsing JSON puluhan ribu record dan menulis SQLite.
            // Kalau dijalankan di thread UI, jendela berhenti merespons selama
            // sinkronisasi. Callback dipindahkan ke dispatcher karena menyentuh
            // properti yang dibinding oleh UI.
            var dispatcher = System.Windows.Application.Current?.Dispatcher;
            void OnUi(Action action)
            {
                if (dispatcher == null || dispatcher.CheckAccess()) action();
                else dispatcher.BeginInvoke(action);
            }

            await Task.Run(() => sync.PullFromServerAsync(
                onUpdate: update => OnUi(() =>
                {
                    var step = Steps.FirstOrDefault(s => s.Name == update.Name);
                    if (step == null) return;
                    step.Status = update.Status;
                    if (!string.IsNullOrWhiteSpace(update.Detail)) step.Detail = update.Detail;
                    ProgressMessage = update.Name;
                }),
                onProgress: message => OnUi(() => ProgressMessage = message)));

            if (sync.LastTenant != null)
                _services.UpdateTenant(sync.LastTenant);

            LastSyncLabel = $"Terakhir sinkron {DateTime.Now:dd/MM/yyyy HH:mm:ss}";
            ProgressMessage = "Selesai";
            StatusMessage = "Semua data berhasil dimuat dari server.";
        });

        NotifyStatusChanged();
        if (HasError)
        {
            LastSyncLabel = "Sinkronisasi gagal";
            ProgressMessage = "Gagal";
        }
    }
}

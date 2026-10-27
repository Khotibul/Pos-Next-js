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
        ResetSteps();
    }

    private void ResetSteps()
    {
        Steps.Clear();
        foreach (var name in new[]
                 {
                     "Produk & stok", "Kategori", "Satuan", "Pelanggan",
                     "Supplier", "Purchase order", "Piutang", "Utang", "Kas",
                     "Penjualan 30 hari", "Shift kasir", "Data tenant"
                 })
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

            var index = 0;
            async Task StepAsync(Func<Task<string>> action)
            {
                var step = Steps[index++];
                step.Status = "Berjalan…";
                ProgressMessage = step.Name;
                try
                {
                    step.Detail = await action();
                    step.Status = "Selesai";
                }
                catch (Exception ex)
                {
                    step.Status = "Gagal";
                    step.Detail = ex.Message;
                    throw;
                }
            }

            await StepAsync(async () =>
            {
                var progress = new Progress<string>(p => ProgressMessage = p);
                var products = await _services.Api.GetAllProductsAsync(progress);
                return $"{products.Count} produk";
            });
            await StepAsync(async () => $"{(await _services.Api.GetCategoriesAsync()).Count} kategori");
            await StepAsync(async () => $"{(await _services.Api.GetUnitsAsync()).Count} satuan");
            await StepAsync(async () => $"{(await _services.Api.GetCustomersAsync()).Count} pelanggan");
            await StepAsync(async () => $"{(await _services.Api.GetSuppliersAsync()).Count} supplier");
            await StepAsync(async () => $"{(await _services.Api.GetPurchaseOrdersAsync()).Count} purchase order");
            await StepAsync(async () => $"{(await _services.Api.GetReceivablesAsync()).Count} piutang");
            await StepAsync(async () => $"{(await _services.Api.GetPayablesAsync()).Count} utang");
            await StepAsync(async () => $"{(await _services.Api.GetCashTransactionsAsync(500)).Count} transaksi kas");
            await StepAsync(async () =>
            {
                var sales = await _services.Api.GetSalesAsync(DateTime.Today.AddDays(-30), DateTime.Now, null, 500);
                return $"{sales.Count} transaksi";
            });
            await StepAsync(async () => $"{(await _services.Api.GetShiftsAsync(null, null, 100)).Count} shift");
            await StepAsync(async () =>
            {
                var tenant = await _services.Api.GetTenantAsync();
                _services.UpdateTenant(tenant);
                return tenant?.Tenant?.Name ?? _services.TenantName;
            });

            LastSyncLabel = $"Terakhir sinkron {DateTime.Now:dd/MM/yyyy HH:mm:ss}";
            ProgressMessage = "Selesai";
            StatusMessage = "Semua data berhasil dimuat dari server.";
        });

        if (HasError)
        {
            LastSyncLabel = "Sinkronisasi gagal";
            ProgressMessage = "Gagal";
        }
    }
}

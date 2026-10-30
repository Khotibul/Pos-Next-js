using PosquDesktop.Models;

namespace PosquDesktop.Services;

public sealed record SyncStepUpdate(string Name, string Status, string Detail);

public sealed class OfflineSyncService
{
    /// <summary>Nama langkah sinkronisasi, dipakai halaman Sinkronisasi dan penarikan otomatis.</summary>
    public static readonly string[] StepNames =
    {
        "Produk & stok", "Kategori", "Satuan", "Brand", "Pelanggan", "Supplier",
        "Purchase order", "Piutang", "Utang", "Kas", "Penjualan 30 hari", "Shift kasir", "Data tenant"
    };

    private readonly ApiClient _api;
    private readonly OfflineStore _store;
    private readonly SemaphoreSlim _gate = new(1, 1);
    private readonly SemaphoreSlim _pullGate = new(1, 1);

    public bool IsSyncing { get; private set; }
    public string? LastError { get; private set; }
    public DateTime? LastSyncAt => _store.LastSyncAt;
    public int PendingCount => _store.PendingCount;
    public int FailedCount => _store.FailedCount;

    /// <summary>Tenant terakhir dari hasil penarikan data.</summary>
    public TenantResponse? LastTenant { get; private set; }

    public event Action? StatusChanged;

    public OfflineSyncService(ApiClient api, OfflineStore store)
    {
        _api = api;
        _store = store;
    }

    public void ReportError(string? message)
    {
        LastError = message;
        StatusChanged?.Invoke();
    }

    public async Task<bool> FlushAsync(CancellationToken ct = default)
    {
        if (!await _gate.WaitAsync(0, ct))
            return false;

        try
        {
            var queue = _store.ReadQueue();
            if (queue.Count == 0)
                return true;

            IsSyncing = true;
            LastError = null;
            StatusChanged?.Invoke();

            var synced = 0;
            foreach (var operation in queue)
            {
                ct.ThrowIfCancellationRequested();
                var attempt = 0;
                while (attempt < 4)
                {
                    try
                    {
                        await _api.SendQueuedOperationAsync(operation, ct);
                        _store.RemoveOperation(operation.Id);
                        synced++;
                        break;
                    }
                    catch (ApiException ex) when (ex.StatusCode is >= 400 and < 500 and not 401 and not 408 and not 429)
                    {
                        operation.Attempts++;
                        _store.ArchiveFailed(operation, ex.Message);
                        _store.RemoveOperation(operation.Id);
                        LastError = ex.Message;
                        break;
                    }
                    catch (Exception ex)
                    {
                        attempt++;
                        operation.Attempts++;
                        operation.LastError = ex.Message;
                        if (attempt >= 4)
                        {
                            _store.UpdateOperation(operation);
                            LastError = ex.Message;
                            goto next;
                        }
                        var delay = (int)Math.Pow(2, attempt) * 250;
                        await Task.Delay(delay, ct);
                    }
                }
                continue;
            next:;
            }

            if (synced > 0) _store.MarkSynced();
            return _store.PendingCount == 0;
        }
        catch (OperationCanceledException)
        {
            return false;
        }
        finally
        {
            IsSyncing = false;
            _gate.Release();
            StatusChanged?.Invoke();
        }
    }

    /// <summary>
    /// Menarik ulang seluruh data dari website ke database lokal desktop
    /// (produk, master data, dan transaksi), supaya isi desktop mengikuti website.
    /// </summary>
    public async Task<bool> PullFromServerAsync(
        Action<SyncStepUpdate>? onUpdate = null,
        Action<string>? onProgress = null,
        CancellationToken ct = default)
    {
        if (!await _pullGate.WaitAsync(0, ct))
            return false;

        try
        {
            if (_api.IsOffline)
                throw new ApiException("Tidak dapat memuat data baru saat offline. Periksa koneksi internet lalu coba lagi.");

            IsSyncing = true;
            LastError = null;
            StatusChanged?.Invoke();

            async Task StepAsync(string name, Func<Task<string>> action)
            {
                ct.ThrowIfCancellationRequested();
                onUpdate?.Invoke(new SyncStepUpdate(name, "Berjalan…", ""));
                try
                {
                    var detail = await action();
                    onUpdate?.Invoke(new SyncStepUpdate(name, "Selesai", detail));
                }
                catch (Exception ex)
                {
                    onUpdate?.Invoke(new SyncStepUpdate(name, "Gagal", ex.Message));
                    throw;
                }
            }

            await StepAsync("Produk & stok", async () =>
            {
                var progress = onProgress == null ? null : new Progress<string>(onProgress);
                var products = await _api.GetAllProductsAsync(progress, ct);
                return $"{products.Count} produk";
            });
            await StepAsync("Kategori", async () => $"{(await _api.GetCategoriesAsync(ct)).Count} kategori");
            await StepAsync("Satuan", async () => $"{(await _api.GetUnitsAsync(ct)).Count} satuan");
            await StepAsync("Brand", async () => $"{(await _api.GetBrandsAsync(ct)).Count} brand");
            await StepAsync("Pelanggan", async () => $"{(await _api.GetCustomersAsync(null, ct)).Count} pelanggan");
            await StepAsync("Supplier", async () => $"{(await _api.GetSuppliersAsync(null, ct)).Count} supplier");
            await StepAsync("Purchase order", async () => $"{(await _api.GetPurchaseOrdersAsync(ct: ct)).Count} purchase order");
            await StepAsync("Piutang", async () => $"{(await _api.GetReceivablesAsync(null, null, ct)).Count} piutang");
            await StepAsync("Utang", async () => $"{(await _api.GetPayablesAsync(null, null, ct)).Count} utang");
            await StepAsync("Kas", async () => $"{(await _api.GetCashTransactionsAsync(500, ct: ct)).Count} transaksi kas");
            await StepAsync("Penjualan 30 hari", async () =>
            {
                // Ambil seluruh halaman penjualan 30 hari terakhir, bukan hanya 500
                // transaksi pertama, lalu simpan hasil lengkapnya ke database lokal.
                const int pageSize = 500;
                var all = new List<Sale>();
                for (var page = 1; page <= 100; page++)
                {
                    ct.ThrowIfCancellationRequested();
                    var batch = await _api.GetSalesAsync(
                        DateTime.Today.AddDays(-30), DateTime.Now, null, pageSize, page, ct);
                    all.AddRange(batch);
                    if (batch.Count < pageSize) break;
                }
                _store.Write("cache_sales", all);
                return $"{all.Count} transaksi";
            });
            await StepAsync("Shift kasir", async () => $"{(await _api.GetShiftsAsync(null, null, 100, ct)).Count} shift");
            await StepAsync("Data tenant", async () =>
            {
                var tenant = await _api.GetTenantAsync(ct);
                LastTenant = tenant;
                return tenant?.Tenant?.Name ?? "tenant";
            });

            _store.MarkSynced();
            return true;
        }
        catch (OperationCanceledException)
        {
            return false;
        }
        catch (ApiException ex)
        {
            LastError = ex.Message;
            throw;
        }
        catch (Exception ex)
        {
            LastError = ex.Message;
            throw;
        }
        finally
        {
            IsSyncing = false;
            _pullGate.Release();
            StatusChanged?.Invoke();
        }
    }

    public void NotifyStatusChanged() => StatusChanged?.Invoke();
}

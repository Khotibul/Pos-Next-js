namespace PosquDesktop.Services;

public sealed class OfflineSyncService
{
    private readonly ApiClient _api;
    private readonly OfflineStore _store;
    private readonly SemaphoreSlim _gate = new(1, 1);

    public bool IsSyncing { get; private set; }
    public string? LastError { get; private set; }
    public DateTime? LastSyncAt => _store.LastSyncAt;
    public int PendingCount => _store.PendingCount;
    public int FailedCount => _store.ReadFailed().Count;

    public event Action? StatusChanged;

    public OfflineSyncService(ApiClient api, OfflineStore store)
    {
        _api = api;
        _store = store;
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
                try
                {
                    await _api.SendQueuedOperationAsync(operation, ct);
                    _store.RemoveOperation(operation.Id);
                    synced++;
                }
                catch (ApiException ex) when (ex.StatusCode is >= 400 and < 500 and not 401 and not 408 and not 429)
                {
                    // Server menolak permanen (validasi/duplikat): arsipkan agar data tidak hilang diam-diam.
                    operation.Attempts++;
                    _store.ArchiveFailed(operation, ex.Message);
                    _store.RemoveOperation(operation.Id);
                    LastError = ex.Message;
                }
                catch (ApiException ex)
                {
                    operation.Attempts++;
                    operation.LastError = ex.Message;
                    _store.UpdateOperation(operation);
                    LastError = ex.Message;
                    break;
                }
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

    public void NotifyStatusChanged() => StatusChanged?.Invoke();
}

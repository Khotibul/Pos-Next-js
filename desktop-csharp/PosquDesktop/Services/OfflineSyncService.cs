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

    public void NotifyStatusChanged() => StatusChanged?.Invoke();
}

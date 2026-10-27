using System.IO;
using System.Text;
using System.Text.Json;

namespace PosquDesktop.Services;

public sealed class OfflineOperation
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string Method { get; set; } = "POST";
    public string Path { get; set; } = "";
    public string? PayloadJson { get; set; }
    public string Entity { get; set; } = "";
    public DateTime CreatedAt { get; set; } = DateTime.Now;
    public int Attempts { get; set; }
    public string? LastError { get; set; }
}

public sealed class OfflineStore
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        WriteIndented = false
    };

    private readonly string _directory;
    private readonly object _sync = new();

    public OfflineStore(string rootDirectory, string scope)
    {
        var safeScope = string.IsNullOrWhiteSpace(scope) ? "default" : scope;
        foreach (var ch in Path.GetInvalidFileNameChars())
            safeScope = safeScope.Replace(ch, '_');
        _directory = Path.Combine(rootDirectory, "offline", safeScope);
        Directory.CreateDirectory(_directory);
    }

    public string DirectoryPath => _directory;

    public T? Read<T>(string key)
    {
        lock (_sync)
        {
            var path = FilePath(key);
            try
            {
                if (!File.Exists(path)) return default;
                return JsonSerializer.Deserialize<T>(File.ReadAllText(path), JsonOptions);
            }
            catch
            {
                return default;
            }
        }
    }

    public void Write<T>(string key, T value)
    {
        lock (_sync)
        {
            var path = FilePath(key);
            try
            {
                var temp = path + ".tmp";
                File.WriteAllText(temp, JsonSerializer.Serialize(value, JsonOptions), Encoding.UTF8);
                File.Move(temp, path, true);
            }
            catch
            {
                // Cache lokal tidak boleh membuat aplikasi berhenti.
            }
        }
    }

    public void Remove(string key)
    {
        lock (_sync)
        {
            try
            {
                var path = FilePath(key);
                if (File.Exists(path)) File.Delete(path);
            }
            catch
            {
                // abaikan
            }
        }
    }

    public List<OfflineOperation> ReadQueue()
    {
        lock (_sync)
        {
            try
            {
                var path = FilePath("outbox");
                if (!File.Exists(path)) return new List<OfflineOperation>();
                return JsonSerializer.Deserialize<List<OfflineOperation>>(
                    File.ReadAllText(path), JsonOptions) ?? new List<OfflineOperation>();
            }
            catch
            {
                return new List<OfflineOperation>();
            }
        }
    }

    public void Enqueue(OfflineOperation operation)
    {
        lock (_sync)
        {
            var queue = ReadQueueLocked();
            queue.Add(operation);
            WriteQueueLocked(queue);
        }
    }

    public void RemoveOperation(string id)
    {
        lock (_sync)
        {
            var queue = ReadQueueLocked();
            var removed = queue.RemoveAll(o => o.Id == id);
            if (removed > 0) WriteQueueLocked(queue);
        }
    }

    public void UpdateOperation(OfflineOperation operation)
    {
        lock (_sync)
        {
            var queue = ReadQueueLocked();
            var index = queue.FindIndex(o => o.Id == operation.Id);
            if (index >= 0) queue[index] = operation;
            else queue.Add(operation);
            WriteQueueLocked(queue);
        }
    }

    public int PendingCount
    {
        get
        {
            lock (_sync)
            {
                return ReadQueueLocked().Count;
            }
        }
    }

    public void ArchiveFailed(OfflineOperation operation, string reason)
    {
        lock (_sync)
        {
            try
            {
                operation.LastError = reason;
                var failed = ReadFailedLocked();
                failed.Insert(0, operation);
                if (failed.Count > 200) failed.RemoveRange(200, failed.Count - 200);
                WriteFailedLocked(failed);
            }
            catch
            {
                // abaikan
            }
        }
    }

    public List<OfflineOperation> ReadFailed()
    {
        lock (_sync)
        {
            return ReadFailedLocked();
        }
    }

    public int RetryFailed()
    {
        lock (_sync)
        {
            var failed = ReadFailedLocked();
            if (failed.Count == 0) return 0;

            var queue = ReadQueueLocked();
            foreach (var operation in failed)
            {
                operation.Attempts = 0;
                operation.LastError = null;
                queue.Add(operation);
            }
            WriteQueueLocked(queue);
            WriteFailedLocked(new List<OfflineOperation>());
            return failed.Count;
        }
    }

    public DateTime? LastSyncAt
    {
        get
        {
            var value = Read<string>("last_sync");
            return DateTime.TryParse(value, out var parsed) ? parsed : null;
        }
    }

    public void MarkSynced()
    {
        Write("last_sync", DateTime.Now.ToString("O"));
    }

    private List<OfflineOperation> ReadQueueLocked()
    {
        try
        {
            var path = FilePath("outbox");
            if (!File.Exists(path)) return new List<OfflineOperation>();
            return JsonSerializer.Deserialize<List<OfflineOperation>>(
                File.ReadAllText(path), JsonOptions) ?? new List<OfflineOperation>();
        }
        catch
        {
            return new List<OfflineOperation>();
        }
    }

    private void WriteQueueLocked(List<OfflineOperation> queue)
    {
        try
        {
            var path = FilePath("outbox");
            var temp = path + ".tmp";
            File.WriteAllText(temp, JsonSerializer.Serialize(queue, JsonOptions), Encoding.UTF8);
            File.Move(temp, path, true);
        }
        catch
        {
            // abaikan kegagalan tulis antrean
        }
    }

    private List<OfflineOperation> ReadFailedLocked()
    {
        try
        {
            var path = FilePath("failed");
            if (!File.Exists(path)) return new List<OfflineOperation>();
            return JsonSerializer.Deserialize<List<OfflineOperation>>(
                File.ReadAllText(path), JsonOptions) ?? new List<OfflineOperation>();
        }
        catch
        {
            return new List<OfflineOperation>();
        }
    }

    private void WriteFailedLocked(List<OfflineOperation> failed)
    {
        try
        {
            var path = FilePath("failed");
            var temp = path + ".tmp";
            File.WriteAllText(temp, JsonSerializer.Serialize(failed, JsonOptions), Encoding.UTF8);
            File.Move(temp, path, true);
        }
        catch
        {
            // abaikan
        }
    }

    private string FilePath(string key)
    {
        var safe = key;
        foreach (var ch in Path.GetInvalidFileNameChars())
            safe = safe.Replace(ch, '_');
        return Path.Combine(_directory, safe + ".json");
    }
}

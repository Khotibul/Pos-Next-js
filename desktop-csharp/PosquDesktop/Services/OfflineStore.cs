using System.IO;
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

/// <summary>
/// Akses data offline desktop. Seluruh isi (salinan data website, antrean
/// offline, dan metadata) disimpan pada database SQLite lokal lewat
/// <see cref="LocalDatabase"/>.
/// </summary>
public sealed class OfflineStore
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        WriteIndented = false
    };

    private readonly LocalDatabase _database;
    private readonly string _directory;
    private readonly object _sync = new();

    public OfflineStore(string rootDirectory, string scope)
    {
        var safeScope = string.IsNullOrWhiteSpace(scope) ? "default" : scope;
        foreach (var ch in Path.GetInvalidFileNameChars())
            safeScope = safeScope.Replace(ch, '_');
        _directory = Path.Combine(rootDirectory, "offline", safeScope);
        _database = new LocalDatabase(_directory);
    }

    public string DirectoryPath => _directory;
    public string DatabasePath => _database.FilePath;

    public T? Read<T>(string key)
    {
        string? raw;
        // Pembacaan tidak dikunci: WAL menyediakan snapshot terisolasi sehingga reader
        // tidak pernah menunggu writer. Kalau dikunci, thread UI menunggu penulis
        // 34 ribu record di latar belakang dan jendela jadi "Not Responding".
        try
        {
            raw = _database.ReadValue(key);
        }
        catch
        {
            return default;
        }

        if (raw == null) return default;

        try
        {
            return JsonSerializer.Deserialize<T>(raw, JsonOptions);
        }
        catch
        {
            // Nilai cache versi lama tersimpan sebagai string JSON ter-escape.
            var unwrapped = Unwrap(raw);
            if (unwrapped == null || unwrapped == raw) return default;
            try
            {
                return JsonSerializer.Deserialize<T>(unwrapped, JsonOptions);
            }
            catch
            {
                return default;
            }
        }
    }

    public void Write<T>(string key, T value)
    {
        try
        {
            WriteJson(key, JsonSerializer.Serialize(value, JsonOptions));
        }
        catch
        {
            // Cache lokal tidak boleh membuat aplikasi berhenti.
        }
    }

    /// <summary>Menyimpan data mentah dari server (JSON) ke database lokal.</summary>
    public void WriteJson(string key, JsonElement value)
    {
        try
        {
            WriteJson(key, value.GetRawText());
        }
        catch
        {
            // abaikan payload yang tidak valid
        }
    }

    public void WriteJson(string key, string json)
    {
        lock (_sync)
        {
            try
            {
                _database.WriteValue(key, json);
            }
            catch
            {
                // abaikan kegagalan tulis cache
            }
        }
    }

    public string? ReadJson(string key)
    {
        try
        {
            return Unwrap(_database.ReadValue(key));
        }
        catch
        {
            return null;
        }
    }

    /// <summary>
    /// Versi lama menyimpan JSON sebagai string ter-escape; buka satu lapis
    /// supaya data lama tetap bisa dibaca.
    /// </summary>
    private static string? Unwrap(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return null;
        try
        {
            using var document = JsonDocument.Parse(raw);
            if (document.RootElement.ValueKind == JsonValueKind.String)
                return document.RootElement.GetString();
        }
        catch
        {
            // bukan JSON, kembalikan apa adanya
        }
        return raw;
    }

    public void Remove(string key)
    {
        lock (_sync)
        {
            try
            {
                _database.RemoveValue(key);
            }
            catch
            {
                // abaikan
            }
        }
    }

    public List<OfflineOperation> ReadQueue()
    {
        try
        {
            return _database.ReadOperations("outbox");
        }
        catch
        {
            return new List<OfflineOperation>();
        }
    }

    public void Enqueue(OfflineOperation operation)
    {
        lock (_sync)
        {
            try
            {
                _database.SaveOperation("outbox", operation, operation.CreatedAt);
            }
            catch
            {
                // abaikan
            }
        }
    }

    public void RemoveOperation(string id)
    {
        lock (_sync)
        {
            try
            {
                _database.RemoveOperation("outbox", id);
            }
            catch
            {
                // abaikan
            }
        }
    }

    public void UpdateOperation(OfflineOperation operation)
    {
        lock (_sync)
        {
            try
            {
                _database.SaveOperation("outbox", operation, operation.CreatedAt);
            }
            catch
            {
                // abaikan
            }
        }
    }

    public int PendingCount
    {
        get
        {
            try
            {
                return _database.CountOperations("outbox");
            }
            catch
            {
                return 0;
            }
        }
    }

    public int FailedCount
    {
        get
        {
            try
            {
                return _database.CountOperations("failed_operations");
            }
            catch
            {
                return 0;
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
                _database.SaveOperation("failed_operations", operation, DateTime.Now);
                _database.TrimOperations("failed_operations", 200);
            }
            catch
            {
                // abaikan
            }
        }
    }

    public List<OfflineOperation> ReadFailed()
    {
        try
        {
            return _database.ReadOperations("failed_operations");
        }
        catch
        {
            return new List<OfflineOperation>();
        }
    }

    public int RetryFailed()
    {
        lock (_sync)
        {
            try
            {
                var failed = _database.ReadOperations("failed_operations");
                if (failed.Count == 0) return 0;

                foreach (var operation in failed)
                {
                    operation.Attempts = 0;
                    operation.LastError = null;
                    _database.SaveOperation("outbox", operation, operation.CreatedAt);
                }
                _database.ClearOperations("failed_operations");
                return failed.Count;
            }
            catch
            {
                return 0;
            }
        }
    }

    private DateTime? _lastSyncAt;

    public DateTime? LastSyncAt
    {
        get
        {
            // Binding status di thread UI membaca properti ini setiap kali status
            // berubah; simpan di memori supaya tidak membuka SQLite berulang kali.
            if (_lastSyncAt.HasValue) return _lastSyncAt;
            var value = Read<string>("last_sync");
            if (DateTime.TryParse(value, out var parsed)) _lastSyncAt = parsed;
            return _lastSyncAt;
        }
    }

    public void MarkSynced()
    {
        _lastSyncAt = DateTime.Now;
        Write("last_sync", _lastSyncAt.Value.ToString("O"));
    }
}

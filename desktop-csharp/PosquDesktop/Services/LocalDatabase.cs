using System.IO;
using System.Text.Json;
using Microsoft.Data.Sqlite;

namespace PosquDesktop.Services;

/// <summary>
/// Database lokal desktop (SQLite).
///
/// Salinan data dari website disimpan per record pada tabel <c>records</c>
/// (satu baris untuk satu produk/pelanggan/transaksi), nilai tunggal pada
/// <c>store</c>, antrean offline pada <c>outbox</c>, dan data yang ditolak
/// server pada <c>failed_operations</c>.
/// </summary>
public sealed class LocalDatabase
{
    private static readonly JsonDocumentOptions DocOptions = new()
    {
        AllowTrailingCommas = true,
        CommentHandling = JsonCommentHandling.Skip
    };

    private readonly string _connectionString;
    private readonly string _directory;

    public string FilePath { get; }

    public LocalDatabase(string directory)
    {
        _directory = directory;
        Directory.CreateDirectory(_directory);

        FilePath = Path.Combine(_directory, "posqu-desktop.db");
        // Cache privat wajib dipakai bersama WAL. Shared-cache memakai table-level
        // lock dan tidak mendukung WAL, sehingga pembacaan UI thread diblokir oleh
        // penulis latar belakang sampai busy_timeout habis -> jendela "Not Responding".
        _connectionString = new SqliteConnectionStringBuilder
        {
            DataSource = FilePath,
            Mode = SqliteOpenMode.ReadWriteCreate,
            Cache = SqliteCacheMode.Private,
            Pooling = true
        }.ToString();

        Initialize();
    }

    private SqliteConnection Open()
    {
        var connection = new SqliteConnection(_connectionString);
        connection.Open();
        using var pragma = connection.CreateCommand();
        pragma.CommandText = "PRAGMA busy_timeout=5000;";
        pragma.ExecuteNonQuery();
        return connection;
    }

    private void Initialize()
    {
        using var connection = Open();

        using (var pragma = connection.CreateCommand())
        {
            pragma.CommandText = "PRAGMA journal_mode=WAL;";
            pragma.ExecuteNonQuery();
        }

        using var command = connection.CreateCommand();
        command.CommandText = """
            CREATE TABLE IF NOT EXISTS store (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS datasets (
                key TEXT PRIMARY KEY,
                item_count INTEGER NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS records (
                entity TEXT NOT NULL,
                id TEXT NOT NULL,
                position INTEGER NOT NULL,
                json TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                PRIMARY KEY (entity, id)
            );
            CREATE TABLE IF NOT EXISTS outbox (
                id TEXT PRIMARY KEY,
                json TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS failed_operations (
                id TEXT PRIMARY KEY,
                json TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            """;
        command.ExecuteNonQuery();

        MigrateLegacyFiles(connection);
    }

    // ---------------- Salinan data website ----------------

    /// <summary>
    /// Menyimpan satu dataset. Kalau nilainya berupa array record (punya "id"),
    /// isinya dipecah menjadi baris-baris pada tabel records.
    /// </summary>
    public void WriteValue(string key, string json)
    {
        using var connection = Open();
        using var transaction = connection.BeginTransaction();
        WriteValue(connection, transaction, key, json);
        transaction.Commit();
    }

    private static void WriteValue(SqliteConnection connection, SqliteTransaction? transaction, string key, string json)
    {
        var now = DateTime.Now.ToString("O");

        if (TrySplitRecords(json, out var rows))
        {
            using (var deleteRecords = connection.CreateCommand())
            {
                deleteRecords.Transaction = transaction;
                deleteRecords.CommandText = "DELETE FROM records WHERE entity = $entity;";
                deleteRecords.Parameters.AddWithValue("$entity", key);
                deleteRecords.ExecuteNonQuery();
            }

            if (rows.Count > 0)
            {
                using var insert = connection.CreateCommand();
                insert.Transaction = transaction;
                insert.CommandText = """
                    INSERT OR REPLACE INTO records (entity, id, position, json, updated_at)
                    VALUES ($entity, $id, $position, $json, $updated_at);
                    """;
                var entityParam = insert.Parameters.Add("$entity", SqliteType.Text);
                var idParam = insert.Parameters.Add("$id", SqliteType.Text);
                var positionParam = insert.Parameters.Add("$position", SqliteType.Integer);
                var jsonParam = insert.Parameters.Add("$json", SqliteType.Text);
                var updatedParam = insert.Parameters.Add("$updated_at", SqliteType.Text);

                entityParam.Value = key;
                updatedParam.Value = now;

                for (var i = 0; i < rows.Count; i++)
                {
                    idParam.Value = rows[i].Id;
                    positionParam.Value = i;
                    jsonParam.Value = rows[i].Json;
                    insert.ExecuteNonQuery();
                }
            }

            using var markDataset = connection.CreateCommand();
            markDataset.Transaction = transaction;
            markDataset.CommandText = """
                INSERT INTO datasets (key, item_count, updated_at) VALUES ($key, $count, $updated_at)
                ON CONFLICT(key) DO UPDATE SET item_count = $count, updated_at = $updated_at;
                """;
            markDataset.Parameters.AddWithValue("$key", key);
            markDataset.Parameters.AddWithValue("$count", rows.Count);
            markDataset.Parameters.AddWithValue("$updated_at", now);
            markDataset.ExecuteNonQuery();

            using var removeSingle = connection.CreateCommand();
            removeSingle.Transaction = transaction;
            removeSingle.CommandText = "DELETE FROM store WHERE key = $key;";
            removeSingle.Parameters.AddWithValue("$key", key);
            removeSingle.ExecuteNonQuery();
            return;
        }

        using var upsert = connection.CreateCommand();
        upsert.Transaction = transaction;
        upsert.CommandText = """
            INSERT INTO store (key, value, updated_at) VALUES ($key, $value, $updated_at)
            ON CONFLICT(key) DO UPDATE SET value = $value, updated_at = $updated_at;
            """;
        upsert.Parameters.AddWithValue("$key", key);
        upsert.Parameters.AddWithValue("$value", json);
        upsert.Parameters.AddWithValue("$updated_at", now);
        upsert.ExecuteNonQuery();

        using var clearDataset = connection.CreateCommand();
        clearDataset.Transaction = transaction;
        clearDataset.CommandText = "DELETE FROM datasets WHERE key = $key; DELETE FROM records WHERE entity = $key;";
        clearDataset.Parameters.AddWithValue("$key", key);
        clearDataset.ExecuteNonQuery();
    }

    /// <summary>Mengambil kembali nilai tersimpan sebagai teks JSON, atau null kalau belum ada.</summary>
    public string? ReadValue(string key)
    {
        using var connection = Open();

        using (var single = connection.CreateCommand())
        {
            single.CommandText = "SELECT value FROM store WHERE key = $key;";
            single.Parameters.AddWithValue("$key", key);
            if (single.ExecuteScalar() is string value) return value;
        }

        using (var known = connection.CreateCommand())
        {
            known.CommandText = "SELECT 1 FROM datasets WHERE key = $key;";
            known.Parameters.AddWithValue("$key", key);
            if (known.ExecuteScalar() == null) return null;
        }

        using var rows = connection.CreateCommand();
        rows.CommandText = "SELECT json FROM records WHERE entity = $key ORDER BY position;";
        rows.Parameters.AddWithValue("$key", key);

        var items = new List<string>();
        using var reader = rows.ExecuteReader();
        while (reader.Read())
            items.Add(reader.GetString(0));

        return "[" + string.Join(",", items) + "]";
    }

    public void RemoveValue(string key)
    {
        using var connection = Open();
        using var transaction = connection.BeginTransaction();

        using (var single = connection.CreateCommand())
        {
            single.Transaction = transaction;
            single.CommandText = "DELETE FROM store WHERE key = $key;";
            single.Parameters.AddWithValue("$key", key);
            single.ExecuteNonQuery();
        }

        using (var dataset = connection.CreateCommand())
        {
            dataset.Transaction = transaction;
            dataset.CommandText = "DELETE FROM datasets WHERE key = $key; DELETE FROM records WHERE entity = $key;";
            dataset.Parameters.AddWithValue("$key", key);
            dataset.ExecuteNonQuery();
        }

        transaction.Commit();
    }

    public int CountRecords(string entity)
    {
        using var connection = Open();
        using var command = connection.CreateCommand();
        command.CommandText = "SELECT COUNT(*) FROM records WHERE entity = $entity;";
        command.Parameters.AddWithValue("$entity", entity);
        return Convert.ToInt32(command.ExecuteScalar() ?? 0);
    }

    // ---------------- Antrean offline ----------------

    public void SaveOperation(string table, OfflineOperation operation, DateTime createdAt)
    {
        using var connection = Open();
        InsertOperation(connection, table, operation, createdAt);
    }

    private static void InsertOperation(SqliteConnection connection, string table, OfflineOperation operation, DateTime createdAt)
    {
        using var command = connection.CreateCommand();
        command.CommandText = $"INSERT OR REPLACE INTO {table} (id, json, created_at) VALUES ($id, $json, $created_at);";
        command.Parameters.AddWithValue("$id", operation.Id);
        command.Parameters.AddWithValue("$json", JsonSerializer.Serialize(operation));
        command.Parameters.AddWithValue("$created_at", createdAt.ToString("O"));
        command.ExecuteNonQuery();
    }

    public void RemoveOperation(string table, string id)
    {
        using var connection = Open();
        using var command = connection.CreateCommand();
        command.CommandText = $"DELETE FROM {table} WHERE id = $id;";
        command.Parameters.AddWithValue("$id", id);
        command.ExecuteNonQuery();
    }

    public List<OfflineOperation> ReadOperations(string table)
    {
        using var connection = Open();
        using var command = connection.CreateCommand();
        command.CommandText = $"SELECT json FROM {table} ORDER BY created_at;";

        var result = new List<OfflineOperation>();
        using var reader = command.ExecuteReader();
        while (reader.Read())
        {
            try
            {
                var operation = JsonSerializer.Deserialize<OfflineOperation>(
                    reader.GetString(0), new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                if (operation != null) result.Add(operation);
            }
            catch
            {
                // baris rusak dilewati agar antrean tetap jalan
            }
        }
        return result;
    }

    public void ClearOperations(string table)
    {
        using var connection = Open();
        using var command = connection.CreateCommand();
        command.CommandText = $"DELETE FROM {table};";
        command.ExecuteNonQuery();
    }

    /// <summary>
    /// Menghitung antrean tanpa mendeserialisasi seluruh row. Dipakai binding status
    /// di thread UI yang berjalan setiap kali status sinkron berubah.
    /// </summary>
    public int CountOperations(string table)
    {
        using var connection = Open();
        using var command = connection.CreateCommand();
        command.CommandText = $"SELECT COUNT(*) FROM {table};";
        return Convert.ToInt32(command.ExecuteScalar() ?? 0);
    }

    public void TrimOperations(string table, int keep)
    {
        using var connection = Open();
        using var command = connection.CreateCommand();
        command.CommandText = $"""
            DELETE FROM {table} WHERE id NOT IN (
                SELECT id FROM {table} ORDER BY created_at DESC LIMIT $keep
            );
            """;
        command.Parameters.AddWithValue("$keep", keep);
        command.ExecuteNonQuery();
    }

    // ---------------- Helper ----------------

    private static bool TrySplitRecords(string json, out List<(string Id, string Json)> rows)
    {
        rows = new List<(string, string)>();
        try
        {
            using var document = JsonDocument.Parse(json, DocOptions);
            if (document.RootElement.ValueKind != JsonValueKind.Array) return false;

            foreach (var item in document.RootElement.EnumerateArray())
            {
                if (item.ValueKind != JsonValueKind.Object) return false;
                if (!TryGetId(item, out var id)) return false;
                rows.Add((id, item.GetRawText()));
            }
            return true;
        }
        catch
        {
            return false;
        }
    }

    private static bool TryGetId(JsonElement item, out string id)
    {
        id = "";
        foreach (var property in item.EnumerateObject())
        {
            if (!property.Name.Equals("id", StringComparison.OrdinalIgnoreCase)) continue;
            switch (property.Value.ValueKind)
            {
                case JsonValueKind.String:
                    id = property.Value.GetString() ?? "";
                    return id.Length > 0;
                case JsonValueKind.Number:
                    id = property.Value.GetRawText();
                    return true;
            }
        }
        return false;
    }

    /// <summary>
    /// Cache versi lama (file JSON di folder offline) dipindahkan ke SQLite
    /// supaya data offline pengguna tidak hilang setelah pembaruan.
    /// </summary>
    private void MigrateLegacyFiles(SqliteConnection connection)
    {
        string[] files;
        try
        {
            files = Directory.GetFiles(_directory, "*.json", SearchOption.TopDirectoryOnly);
        }
        catch
        {
            return;
        }

        if (files.Length == 0) return;

        var legacyFolder = Path.Combine(_directory, "legacy");
        try { Directory.CreateDirectory(legacyFolder); } catch { return; }

        foreach (var file in files)
        {
            try
            {
                var key = Path.GetFileNameWithoutExtension(file);
                var text = File.ReadAllText(file);
                if (string.IsNullOrWhiteSpace(text))
                {
                    File.Move(file, Path.Combine(legacyFolder, Path.GetFileName(file)), true);
                    continue;
                }

                if (key is "outbox" or "failed")
                {
                    var operations = JsonSerializer.Deserialize<List<OfflineOperation>>(
                        text, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                    if (operations != null)
                    {
                        var table = key == "outbox" ? "outbox" : "failed_operations";
                        foreach (var operation in operations)
                            InsertOperation(connection, table, operation, operation.CreatedAt);
                    }
                }
                else
                {
                    WriteValue(connection, null, key, text);
                }

                File.Move(file, Path.Combine(legacyFolder, Path.GetFileName(file)), true);
            }
            catch
            {
                // file rusak dibiarkan; aplikasi tetap berjalan dengan database baru
            }
        }
    }
}

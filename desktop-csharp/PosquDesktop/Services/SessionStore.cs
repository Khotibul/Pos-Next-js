using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using PosquDesktop.Models;

namespace PosquDesktop.Services;

public sealed class AppSettings
{
    public const string DefaultApiBaseUrl = "https://pos-next-js-kohl.vercel.app/api";

    public string ApiBaseUrl { get; set; } = DefaultApiBaseUrl;
    public bool RememberPassword { get; set; }
    public string? RememberedEmail { get; set; }
    public string? ProtectedPassword { get; set; }
    public string? PrinterName { get; set; }
    public bool AutoPrintAfterPayment { get; set; }
}

public sealed class SessionStore
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        WriteIndented = true,
        PropertyNameCaseInsensitive = true
    };

    private readonly string _directory;
    private readonly string _settingsPath;
    private readonly string _sessionPath;

    public AppSettings Settings { get; private set; } = new();
    public StoredSession? Session { get; private set; }

    public SessionStore()
    {
        _directory = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "POSQU Desktop");
        Directory.CreateDirectory(_directory);
        _settingsPath = Path.Combine(_directory, "settings.json");
        _sessionPath = Path.Combine(_directory, "session.json");
        Load();
    }

    public string DataDirectory => _directory;

    private void Load()
    {
        try
        {
            if (File.Exists(_settingsPath))
            {
                Settings = JsonSerializer.Deserialize<AppSettings>(
                    File.ReadAllText(_settingsPath), JsonOptions) ?? new AppSettings();
            }
        }
        catch
        {
            Settings = new AppSettings();
        }

        if (string.IsNullOrWhiteSpace(Settings.ApiBaseUrl))
            Settings.ApiBaseUrl = AppSettings.DefaultApiBaseUrl;

        try
        {
            if (File.Exists(_sessionPath))
            {
                var stored = JsonSerializer.Deserialize<StoredSession>(
                    File.ReadAllText(_sessionPath), JsonOptions);
                if (stored?.Token is { Length: > 0 } token)
                {
                    stored.Token = Unprotect(token);
                    if (!string.IsNullOrWhiteSpace(stored.Token))
                        Session = stored;
                }
            }
        }
        catch
        {
            Session = null;
        }
    }

    public void SaveSettings()
    {
        try
        {
            File.WriteAllText(_settingsPath, JsonSerializer.Serialize(Settings, JsonOptions));
        }
        catch
        {
            // Pengaturan gagal disimpan tidak boleh membuat aplikasi crash.
        }
    }

    public void SaveSession(StoredSession session)
    {
        Session = session;
        try
        {
            var copy = new StoredSession
            {
                Token = Protect(session.Token),
                User = session.User,
                SavedAt = session.SavedAt
            };
            File.WriteAllText(_sessionPath, JsonSerializer.Serialize(copy, JsonOptions));
        }
        catch
        {
            // Abaikan kegagalan penyimpanan sesi.
        }
    }

    public void ClearSession()
    {
        Session = null;
        try
        {
            if (File.Exists(_sessionPath)) File.Delete(_sessionPath);
        }
        catch
        {
            // Abaikan.
        }
    }

    public void SaveRememberedCredentials(string email, string password)
    {
        Settings.RememberPassword = true;
        Settings.RememberedEmail = email.Trim().ToLowerInvariant();
        Settings.ProtectedPassword = Protect(password);
        SaveSettings();
    }

    public void ClearRememberedCredentials()
    {
        Settings.RememberPassword = false;
        Settings.RememberedEmail = null;
        Settings.ProtectedPassword = null;
        SaveSettings();
    }

    public string? GetRememberedPassword()
    {
        if (!Settings.RememberPassword || string.IsNullOrWhiteSpace(Settings.ProtectedPassword))
            return null;
        var value = Unprotect(Settings.ProtectedPassword);
        return string.IsNullOrEmpty(value) ? null : value;
    }

    private static string Protect(string value)
    {
        if (string.IsNullOrEmpty(value)) return "";
        try
        {
            var bytes = ProtectedData.Protect(
                Encoding.UTF8.GetBytes(value), null, DataProtectionScope.CurrentUser);
            return Convert.ToBase64String(bytes);
        }
        catch
        {
            return "";
        }
    }

    private static string Unprotect(string value)
    {
        if (string.IsNullOrEmpty(value)) return "";
        try
        {
            var bytes = ProtectedData.Unprotect(
                Convert.FromBase64String(value), null, DataProtectionScope.CurrentUser);
            return Encoding.UTF8.GetString(bytes);
        }
        catch
        {
            return "";
        }
    }
}

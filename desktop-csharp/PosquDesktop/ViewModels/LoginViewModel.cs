using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using PosquDesktop.Services;

namespace PosquDesktop.ViewModels;

public partial class LoginViewModel : ObservableObject
{
    private readonly AppServices _services;

    [ObservableProperty] private string email = "";
    [ObservableProperty] private string password = "";
    [ObservableProperty] private bool rememberPassword;
    [ObservableProperty] private string apiBaseUrl = "";
    [ObservableProperty] private bool showServerSettings;
    [ObservableProperty] private bool isBusy;
    [ObservableProperty] private string? errorMessage;

    public bool HasError => !string.IsNullOrWhiteSpace(ErrorMessage);
    public string AppVersion => "1.0.0";

    public event Action? LoginSucceeded;

    public LoginViewModel(AppServices services)
    {
        _services = services;
        var settings = services.Store.Settings;
        Email = settings.RememberedEmail ?? "";
        RememberPassword = settings.RememberPassword;
        if (settings.RememberPassword)
            Password = services.Store.GetRememberedPassword() ?? "";
        ApiBaseUrl = settings.ApiBaseUrl;
    }

    partial void OnErrorMessageChanged(string? value) => OnPropertyChanged(nameof(HasError));

    [RelayCommand]
    private void ToggleServerSettings() => ShowServerSettings = !ShowServerSettings;

    [RelayCommand]
    private async Task LoginAsync()
    {
        if (IsBusy) return;
        ErrorMessage = null;

        var email = Email.Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(Password))
        {
            ErrorMessage = "Email dan password wajib diisi.";
            return;
        }

        var baseUrl = ApiClient.NormalizeBaseUrl(ApiBaseUrl);
        ApiBaseUrl = baseUrl;

        IsBusy = true;
        try
        {
            _services.Api.SetBaseUrl(baseUrl);
            _services.Store.Settings.ApiBaseUrl = baseUrl;
            var (session, tenant) = await _services.Api.LoginAsync(email, Password);

            if (RememberPassword)
                _services.Store.SaveRememberedCredentials(email, Password);
            else
                _services.Store.ClearRememberedCredentials();

            _services.Store.SaveSettings();
            _services.SignIn(session, tenant, rememberSession: true);
            LoginSucceeded?.Invoke();
        }
        catch (ApiException ex)
        {
            ErrorMessage = ex.StatusCode switch
            {
                429 => "Terlalu banyak percobaan login. Tunggu sekitar 1 menit lalu coba lagi.",
                401 => "Email atau password salah.",
                403 => ex.Message,
                _ => ex.Message
            };
        }
        catch (Exception ex)
        {
            ErrorMessage = "Login gagal: " + ex.Message;
        }
        finally
        {
            IsBusy = false;
        }
    }
}

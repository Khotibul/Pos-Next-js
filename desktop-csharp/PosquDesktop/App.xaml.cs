using System.Globalization;
using System.IO;
using System.Windows;
using System.Windows.Markup;
using System.Windows.Threading;
using PosquDesktop.Services;
using PosquDesktop.ViewModels;

namespace PosquDesktop;

public partial class App : Application
{
    public static App CurrentApp => (App)Current;
    private bool _handlingUnauthorized;

    protected override void OnStartup(StartupEventArgs e)
    {
        base.OnStartup(e);

        var culture = new CultureInfo("id-ID");
        CultureInfo.DefaultThreadCurrentCulture = culture;
        CultureInfo.DefaultThreadCurrentUICulture = culture;
        Thread.CurrentThread.CurrentCulture = culture;
        Thread.CurrentThread.CurrentUICulture = culture;
        FrameworkElement.LanguageProperty.OverrideMetadata(
            typeof(FrameworkElement),
            new FrameworkPropertyMetadata(XmlLanguage.GetLanguage("id-ID")));

        DispatcherUnhandledException += OnUnhandledException;

        var services = AppServices.Initialize();
        if (services.IsLoggedIn)
            ShowMain();
        else
            ShowLogin();
    }

    public void ShowLogin()
    {
        var viewModel = new LoginViewModel(AppServices.Current);
        viewModel.LoginSucceeded += ShowMain;
        var window = new LoginWindow { DataContext = viewModel };
        window.Show();
        MainWindow = window;
        CloseOtherWindows(window);
        window.Activate();
    }

    public void ShowMain()
    {
        if (!AppServices.Current.IsLoggedIn)
        {
            ShowLogin();
            return;
        }

        var viewModel = new MainViewModel(AppServices.Current);
        viewModel.LogoutRequested += ShowLogin;
        var window = new MainWindow { DataContext = viewModel };
        window.Show();
        MainWindow = window;
        CloseOtherWindows(window);
        viewModel.Start();
        window.Activate();
    }

    private void CloseOtherWindows(Window keep)
    {
        foreach (var window in Windows.OfType<Window>().Where(w => w != keep).ToList())
        {
            try { window.Close(); } catch { /* abaikan */ }
        }
    }

    public void HandleUnauthorized(string? message)
    {
        if (_handlingUnauthorized) return;
        if (MainWindow is LoginWindow) return;

        _handlingUnauthorized = true;
        try
        {
            MessageBox.Show(
                message ?? "Sesi login sudah tidak berlaku. Silakan login kembali.",
                "Sesi Berakhir", MessageBoxButton.OK, MessageBoxImage.Warning);
            AppServices.Current.SignOut();
            ShowLogin();
        }
        finally
        {
            _handlingUnauthorized = false;
        }
    }

    private void OnUnhandledException(object sender, DispatcherUnhandledExceptionEventArgs e)
    {
        try
        {
            var folder = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "POSQU Desktop");
            Directory.CreateDirectory(folder);
            File.AppendAllText(
                Path.Combine(folder, "error.log"),
                $"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] {e.Exception}\n\n");
        }
        catch
        {
            // abaikan kegagalan logging
        }

        MessageBox.Show(
            "Terjadi kesalahan tak terduga.\n\n" + e.Exception.Message,
            "POSQU Desktop", MessageBoxButton.OK, MessageBoxImage.Error);
        e.Handled = true;
    }
}

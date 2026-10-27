using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using PosquDesktop.Services;

namespace PosquDesktop.ViewModels;

public partial class SettingsViewModel : ViewModelBase
{
    private readonly AppServices _services;

    [ObservableProperty] private string apiBaseUrl = "";
    [ObservableProperty] private string printerName = "";
    [ObservableProperty] private bool autoPrintAfterPayment;
    [ObservableProperty] private bool rememberPassword;

    public string TenantName => _services.TenantName;
    public string PlanLabel => _services.PlanLabel;
    public string UserName => _services.User.Name;
    public string UserEmail => _services.User.Email;
    public string UserRole => _services.User.DisplayRole;
    public string DataFolder => _services.Store.DataDirectory;
    public string AppVersion => "1.0.0";
    public string SessionInfo => _services.Session == null
        ? "Tidak ada sesi aktif"
        : $"Login {_services.Session.SavedAt:dd/MM/yyyy HH:mm}";

    public SettingsViewModel(AppServices services)
    {
        _services = services;
        LoadSettings();
    }

    private void LoadSettings()
    {
        var settings = _services.Store.Settings;
        ApiBaseUrl = settings.ApiBaseUrl;
        PrinterName = settings.PrinterName ?? "";
        AutoPrintAfterPayment = settings.AutoPrintAfterPayment;
        RememberPassword = settings.RememberPassword;
    }

    [RelayCommand]
    private void Save()
    {
        var newUrl = ApiClient.NormalizeBaseUrl(ApiBaseUrl);
        var oldUrl = _services.Api.BaseUrl;
        var urlChanged = !string.Equals(newUrl, oldUrl, StringComparison.OrdinalIgnoreCase);

        _services.Store.Settings.ApiBaseUrl = newUrl;
        _services.Store.Settings.PrinterName = string.IsNullOrWhiteSpace(PrinterName) ? null : PrinterName.Trim();
        _services.Store.Settings.AutoPrintAfterPayment = AutoPrintAfterPayment;
        if (!RememberPassword) _services.Store.ClearRememberedCredentials();
        else _services.Store.Settings.RememberPassword = true;

        _services.Api.SetBaseUrl(newUrl);
        _services.Store.SaveSettings();
        ApiBaseUrl = newUrl;

        if (urlChanged)
        {
            StatusMessage = "Alamat server diperbarui. Silakan login ulang.";
            _services.SignOut();
            App.CurrentApp.ShowLogin();
        }
        else
        {
            StatusMessage = "Pengaturan berhasil disimpan.";
        }
    }

    [RelayCommand]
    private void TestPrinter()
    {
        var dialog = new System.Windows.Controls.PrintDialog();
        if (!string.IsNullOrWhiteSpace(PrinterName))
        {
            try
            {
                dialog.PrintQueue = new System.Printing.PrintQueue(
                    new System.Printing.LocalPrintServer(), PrinterName.Trim());
            }
            catch
            {
                // Nama printer tidak ditemukan; pengguna tetap bisa memilih manual.
            }
        }

        if (dialog.ShowDialog() != true) return;
        var document = new System.Windows.Documents.FlowDocument(
            new System.Windows.Documents.Paragraph(
                new System.Windows.Documents.Run("POSQU Desktop — tes printer berhasil."))
            {
                FontSize = 16
            })
        {
            PagePadding = new System.Windows.Thickness(40)
        };
        dialog.PrintDocument(
            ((System.Windows.Documents.IDocumentPaginatorSource)document).DocumentPaginator,
            "POSQU Test Print");
        StatusMessage = "Tes cetak dikirim ke printer.";
    }

    [RelayCommand]
    private void Logout()
    {
        if (!Confirm("Keluar dari akun ini sekarang?", "Logout")) return;
        _services.SignOut();
        App.CurrentApp.ShowLogin();
    }
}

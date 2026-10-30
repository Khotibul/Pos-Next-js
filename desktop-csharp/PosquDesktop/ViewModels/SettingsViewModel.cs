using System.Collections.ObjectModel;
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

    [ObservableProperty] private string paperSize = ReceiptPaper.Size80mm;
    [ObservableProperty] private string receiptHeaderTitle = "";
    [ObservableProperty] private string receiptHeaderSubtitle = "";
    [ObservableProperty] private string receiptFooterNote = "Terima kasih telah berbelanja";
    [ObservableProperty] private bool showSku = true;
    [ObservableProperty] private bool showDiscount = true;
    [ObservableProperty] private bool showTax = true;
    [ObservableProperty] private bool showPolicyLine = true;

    [ObservableProperty] private string statusPrinter = "Belum ada printer dipilih";

    public ObservableCollection<string> AvailablePrinters { get; } = new();

    public string TenantName => _services.TenantName;
    public string PlanLabel => _services.PlanLabel;
    public string UserName => _services.User.Name;
    public string UserEmail => _services.User.Email;
    public string UserRole => _services.User.DisplayRole;
    public string DataFolder => _services.Store.DataDirectory;
    public string AppVersion => "1.1.0";
    public string SessionInfo => _services.Session == null
        ? "Tidak ada sesi aktif"
        : $"Login {_services.Session.SavedAt:dd/MM/yyyy HH:mm}";

    public SettingsViewModel(AppServices services)
    {
        _services = services;
        LoadSettings();
        RefreshPrinters();
    }

    private void LoadSettings()
    {
        var settings = _services.Store.Settings;
        ApiBaseUrl = settings.ApiBaseUrl;
        PrinterName = settings.PrinterName ?? "";
        AutoPrintAfterPayment = settings.AutoPrintAfterPayment;
        RememberPassword = settings.RememberPassword;
        PaperSize = settings.NormalizedPaperSize;
        ReceiptHeaderTitle = settings.ReceiptHeaderTitle;
        ReceiptHeaderSubtitle = settings.ReceiptHeaderSubtitle;
        ReceiptFooterNote = settings.ReceiptFooterNote;
        ShowSku = settings.ShowSku;
        ShowDiscount = settings.ShowDiscount;
        ShowTax = settings.ShowTax;
        ShowPolicyLine = settings.ShowPolicyLine;
        UpdatePrinterStatus();
    }

    partial void OnPrinterNameChanged(string value) => UpdatePrinterStatus();

    private void UpdatePrinterStatus() =>
        StatusPrinter = string.IsNullOrWhiteSpace(PrinterName)
            ? "Belum ada printer dipilih"
            : $"Terpilih: {PrinterName.Trim()}";

    [RelayCommand]
    private void RefreshPrinters()
    {
        AvailablePrinters.Clear();
        try
        {
            foreach (var queue in new System.Printing.LocalPrintServer().GetPrintQueues())
                AvailablePrinters.Add(queue.Name);
        }
        catch
        {
            // Layanan spooler tidak tersedia; daftar dikosongkan, nama manual tetap bisa diketik.
        }

        if (!string.IsNullOrWhiteSpace(PrinterName) &&
            !AvailablePrinters.Contains(PrinterName.Trim()))
            AvailablePrinters.Insert(0, PrinterName.Trim());

        UpdatePrinterStatus();
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
        _services.Store.Settings.PaperSize = PaperSize == ReceiptPaper.Size58mm
            ? ReceiptPaper.Size58mm
            : ReceiptPaper.Size80mm;
        _services.Store.Settings.ReceiptHeaderTitle = ReceiptHeaderTitle.Trim();
        _services.Store.Settings.ReceiptHeaderSubtitle = ReceiptHeaderSubtitle.Trim();
        _services.Store.Settings.ReceiptFooterNote = ReceiptFooterNote.Trim();
        _services.Store.Settings.ShowSku = ShowSku;
        _services.Store.Settings.ShowDiscount = ShowDiscount;
        _services.Store.Settings.ShowTax = ShowTax;
        _services.Store.Settings.ShowPolicyLine = ShowPolicyLine;
        if (!RememberPassword) _services.Store.ClearRememberedCredentials();
        else _services.Store.Settings.RememberPassword = true;

        _services.Api.SetBaseUrl(newUrl);
        _services.Store.SaveSettings();
        ApiBaseUrl = newUrl;
        UpdatePrinterStatus();

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

        var document = PrintHelper.BuildTestDocument(
            _services.Store.Settings, TenantName, PrinterName);
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

using System.Windows;
using System.Windows.Threading;
using PosquDesktop.Models;
using PosquDesktop.Services;

namespace PosquDesktop.Views.Dialogs;

public sealed class ReceiptLine
{
    public string Name { get; init; } = "";
    public string QtyPrice { get; init; } = "";
    public string TotalText { get; init; } = "";
    public string SkuLabel { get; init; } = "";
    public bool ShowSkuLine => SkuLabel.Length > 0;
}

public partial class ReceiptWindow : Window
{
    private readonly Sale _sale;
    private readonly AppSettings _settings;

    public string StoreName { get; }
    public string HeaderTitle => string.IsNullOrWhiteSpace(_settings.ReceiptHeaderTitle)
        ? StoreName
        : _settings.ReceiptHeaderTitle.Trim();
    public string HeaderSubtitle => _settings.ReceiptHeaderSubtitle.Trim();
    public bool HasSubtitle => HeaderSubtitle.Length > 0;
    public string FooterNote => _settings.ReceiptFooterNote.Trim();
    public bool ShowPolicyLine => _settings.ShowPolicyLine;
    public double ReceiptMaxWidth => _settings.NormalizedPaperSize == ReceiptPaper.Size58mm ? 250 : 340;
    public string InvoiceNo => _sale.InvoiceNo;
    public string DateLabel => _sale.CreatedAt.ToString("dd/MM/yyyy HH:mm");
    public string CashierName => AppServices.Current.User.Name;
    public bool HasCustomer => !string.IsNullOrWhiteSpace(_sale.CustomerName);
    public string CustomerLabel => _sale.CustomerName ?? "";
    public string SubtotalText => Formatters.Rupiah(_sale.Subtotal);
    public bool HasDiscount => _sale.Discount > 0 && _settings.ShowDiscount;
    public string DiscountText => "-" + Formatters.Rupiah(_sale.Discount);
    public bool HasTax => _sale.Tax > 0 && _settings.ShowTax;
    public string TaxText => Formatters.Rupiah(_sale.Tax);
    public bool HasDueDate => _sale.DueDate.HasValue;
    public string DueDateText => _sale.DueDate?.ToString("dd/MM/yyyy") ?? "";
    public string TotalText => Formatters.Rupiah(_sale.Total);
    public string PaymentLabel => _sale.PaymentLabel;
    public string PaidText => Formatters.Rupiah(_sale.PaidAmount);
    public string ChangeText => Formatters.Rupiah(_sale.ChangeAmount);
    public string Note => _sale.Notes ?? "";
    public IReadOnlyList<ReceiptLine> Lines { get; }

    public ReceiptWindow(Sale sale, string storeName, AppSettings settings)
    {
        _sale = sale;
        _settings = settings;
        StoreName = storeName;
        Lines = sale.Items.Select(i => new ReceiptLine
        {
            Name = i.Name,
            QtyPrice = $"{Formatters.Number(i.Qty)} x {Formatters.Rupiah(i.Price)}",
            TotalText = Formatters.Rupiah(i.LineTotal),
            SkuLabel = settings.ShowSku && !string.IsNullOrWhiteSpace(i.Sku) ? $"[{i.Sku}]" : ""
        }).ToList();

        InitializeComponent();
        DataContext = this;
        Loaded += OnLoaded;
    }

    private void OnLoaded(object sender, RoutedEventArgs e)
    {
        if (!_settings.AutoPrintAfterPayment || string.IsNullOrWhiteSpace(_settings.PrinterName))
            return;

        Dispatcher.BeginInvoke(new Action(() =>
        {
            try
            {
                PrintHelper.Print(_sale, StoreName, _settings, silent: true);
            }
            catch
            {
                // Cetak otomatis gagal tidak boleh menutup struk.
            }
        }), DispatcherPriority.ApplicationIdle);
    }

    private void Print_Click(object sender, RoutedEventArgs e)
    {
        try
        {
            PrintHelper.Print(_sale, StoreName, _settings, silent: false);
        }
        catch (Exception ex)
        {
            MessageBox.Show("Gagal mencetak struk: " + ex.Message, "Cetak Struk",
                MessageBoxButton.OK, MessageBoxImage.Error);
        }
    }

    private void Close_Click(object sender, RoutedEventArgs e) => Close();
}

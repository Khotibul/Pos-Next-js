using System.Printing;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Documents;
using System.Windows.Media;
using PosquDesktop.Models;

namespace PosquDesktop.Services;

public static class PrintHelper
{
    private static readonly FontFamily MonoFont = new("Consolas");
    private static readonly FontFamily UiFont = new("Segoe UI");

    public static void Print(Sale sale, string storeName, AppSettings settings, bool silent)
    {
        var dialog = CreateDialog(settings.PrinterName);

        if (!silent || dialog.PrintQueue == null)
        {
            if (dialog.ShowDialog() != true) return;
        }

        var document = BuildDocument(sale, storeName, settings);
        var paginator = ((IDocumentPaginatorSource)document).DocumentPaginator;
        dialog.PrintDocument(paginator, "Struk " + sale.InvoiceNo);
    }

    public static PrintDialog CreateDialog(string? printerName)
    {
        var dialog = new PrintDialog();
        if (!string.IsNullOrWhiteSpace(printerName))
        {
            try
            {
                dialog.PrintQueue = new PrintQueue(new LocalPrintServer(), printerName.Trim());
            }
            catch
            {
                // fallback ke printer default
            }
        }

        if (dialog.PrintQueue == null)
        {
            try { dialog.PrintQueue = LocalPrintServer.GetDefaultPrintQueue(); }
            catch { /* biarkan pengguna memilih */ }
        }

        return dialog;
    }

    public static FlowDocument BuildTestDocument(AppSettings settings, string storeName, string? printerName)
    {
        var metrics = ReceiptPaper.Resolve(settings.NormalizedPaperSize);
        var title = string.IsNullOrWhiteSpace(settings.ReceiptHeaderTitle)
            ? storeName
            : settings.ReceiptHeaderTitle.Trim();

        var document = CreateDocument(metrics);

        document.Blocks.Add(Centered(title, UiFont, 14, FontWeights.Bold, Brushes.Black, 0, 4));
        if (!string.IsNullOrWhiteSpace(settings.ReceiptHeaderSubtitle))
            document.Blocks.Add(Centered(settings.ReceiptHeaderSubtitle.Trim(), MonoFont, 9,
                FontWeights.Normal, Brushes.DimGray, 0, 8));

        document.Blocks.Add(NewSeparator(metrics));
        AddLine(document, "Halaman uji coba printer");
        AddLine(document, $"Dicetak      : {DateTime.Now:dd/MM/yyyy HH:mm}");
        AddLine(document, $"Printer      : {(string.IsNullOrWhiteSpace(printerName) ? "(printer default)" : printerName.Trim())}");
        AddLine(document, $"Ukuran kertas: {PaperLabel(settings.NormalizedPaperSize)}");
        AddLine(document, $"Lebar kertas : {metrics.ContentWidth:0} pt");
        document.Blocks.Add(NewSeparator(metrics));

        document.Blocks.Add(Centered("TES CETAK BERHASIL", MonoFont, 11, FontWeights.Bold,
            Brushes.Black, 4, 4));
        document.Blocks.Add(Centered("POSQU Desktop " + AppVersionLabel, MonoFont, 9,
            FontWeights.Normal, Brushes.DimGray, 0, 0));

        return document;
    }

    private static FlowDocument CreateDocument(ReceiptPaper.Metrics metrics) => new()
    {
        FontFamily = MonoFont,
        FontSize = 10,
        PageWidth = metrics.PageWidth,
        PageHeight = 1200,
        ColumnWidth = metrics.ContentWidth,
        PagePadding = new Thickness(10),
        Foreground = Brushes.Black
    };

    private static FlowDocument BuildDocument(Sale sale, string storeName, AppSettings settings)
    {
        var metrics = ReceiptPaper.Resolve(settings.NormalizedPaperSize);
        var document = CreateDocument(metrics);

        var title = string.IsNullOrWhiteSpace(settings.ReceiptHeaderTitle)
            ? storeName
            : settings.ReceiptHeaderTitle.Trim();

        document.Blocks.Add(Centered(title, UiFont, 14, FontWeights.Bold, Brushes.Black, 0, 2));

        if (!string.IsNullOrWhiteSpace(settings.ReceiptHeaderSubtitle))
            document.Blocks.Add(Centered(settings.ReceiptHeaderSubtitle.Trim(), MonoFont, 9,
                FontWeights.Normal, Brushes.DimGray, 0, 4));

        document.Blocks.Add(Centered("Struk Penjualan", MonoFont, 9, FontWeights.Normal,
            Brushes.DimGray, 0, 6));
        document.Blocks.Add(NewSeparator(metrics));

        AddLine(document, $"No. Invoice : {sale.InvoiceNo}");
        AddLine(document, $"Tanggal     : {sale.CreatedAt:dd/MM/yyyy HH:mm}");
        AddLine(document, $"Kasir       : {AppServices.Current.User.Name}");
        if (!string.IsNullOrWhiteSpace(sale.CustomerName))
            AddLine(document, $"Pelanggan   : {sale.CustomerName}");
        document.Blocks.Add(NewSeparator(metrics));

        var table = new Table { CellSpacing = 0, Margin = new Thickness(0) };
        table.Columns.Add(new TableColumn { Width = new GridLength(metrics.ColumnName) });
        table.Columns.Add(new TableColumn { Width = new GridLength(metrics.ColumnAmount) });
        var rowGroup = new TableRowGroup();
        table.RowGroups.Add(rowGroup);

        foreach (var item in sale.Items)
        {
            var row = new TableRow();
            var nameCell = new TableCell { Padding = new Thickness(0, 2, 2, 2) };
            nameCell.Blocks.Add(new Paragraph(new Run(item.Name))
            {
                FontWeight = FontWeights.SemiBold,
                Margin = new Thickness(0),
                FontSize = 9.5
            });
            nameCell.Blocks.Add(new Paragraph(new Run(
                $"{Formatters.Number(item.Qty)} x {Formatters.Rupiah(item.Price)}"))
            {
                FontSize = 8.5,
                Foreground = Brushes.DimGray,
                Margin = new Thickness(0, 1, 0, 0)
            });
            if (settings.ShowSku && !string.IsNullOrWhiteSpace(item.Sku))
            {
                nameCell.Blocks.Add(new Paragraph(new Run($"[{item.Sku}]"))
                {
                    FontSize = 8,
                    Foreground = Brushes.DimGray,
                    Margin = new Thickness(0, 1, 0, 0)
                });
            }
            row.Cells.Add(nameCell);

            var amountCell = new TableCell { Padding = new Thickness(0, 2, 0, 2) };
            amountCell.Blocks.Add(new Paragraph(new Run(Formatters.Rupiah(item.LineTotal)))
            {
                TextAlignment = TextAlignment.Right,
                Margin = new Thickness(0),
                FontSize = 9.5
            });
            row.Cells.Add(amountCell);
            rowGroup.Rows.Add(row);
        }

        document.Blocks.Add(table);
        document.Blocks.Add(NewSeparator(metrics));

        AddLine(document, FormatTotal("Subtotal", sale.Subtotal));
        if (sale.Discount > 0 && settings.ShowDiscount)
            AddLine(document, FormatTotal("Diskon", -sale.Discount));
        if (sale.Tax > 0 && settings.ShowTax)
            AddLine(document, FormatTotal("Pajak", sale.Tax));
        var total = new Paragraph(new Run(FormatTotal("TOTAL", sale.Total)))
        {
            FontWeight = FontWeights.Bold,
            FontSize = 11.5,
            Margin = new Thickness(0, 2, 0, 2)
        };
        document.Blocks.Add(total);
        AddLine(document, FormatTotal("Diterima", sale.PaidAmount));
        AddLine(document, FormatTotal("Kembalian", sale.ChangeAmount));
        AddLine(document, $"Pembayaran  : {sale.PaymentLabel}");
        if (sale.DueDate.HasValue)
            AddLine(document, $"Jatuh tempo : {sale.DueDate.Value:dd/MM/yyyy}");

        if (!string.IsNullOrWhiteSpace(sale.Notes))
            AddLine(document, "Catatan     : " + sale.Notes);

        document.Blocks.Add(NewSeparator(metrics));

        var footer = settings.ReceiptFooterNote.Trim();
        if (!string.IsNullOrWhiteSpace(footer))
            document.Blocks.Add(Centered(footer, MonoFont, 9, FontWeights.Normal,
                Brushes.Black, 4, 2));

        if (settings.ShowPolicyLine)
            document.Blocks.Add(Centered("Barang yang sudah dibeli tidak dapat ditukar",
                MonoFont, 8, FontWeights.Normal, Brushes.DimGray, 0, 0));

        return document;
    }

    private static string PaperLabel(string paperSize) =>
        paperSize == ReceiptPaper.Size58mm ? "58 mm" : "80 mm";

    private static string FormatTotal(string label, decimal amount) =>
        $"{label,-14}{Formatters.Rupiah(amount),16}";

    private static void AddLine(FlowDocument document, string text)
    {
        document.Blocks.Add(new Paragraph(new Run(text))
        {
            Margin = new Thickness(0, 1, 0, 0),
            FontSize = 9
        });
    }

    private static Paragraph Centered(string text, FontFamily family, double size,
        FontWeight weight, Brush foreground, double marginTop, double marginBottom)
    {
        return new Paragraph(new Run(text))
        {
            FontFamily = family,
            FontSize = size,
            FontWeight = weight,
            TextAlignment = TextAlignment.Center,
            Foreground = foreground,
            Margin = new Thickness(0, marginTop, 0, marginBottom)
        };
    }

    private static Paragraph NewSeparator(ReceiptPaper.Metrics metrics) => new(
        new Run(new string('-', metrics.DashCount)))
    {
        TextAlignment = TextAlignment.Center,
        Foreground = Brushes.Gray,
        Margin = new Thickness(0, 5, 0, 5),
        FontSize = 9
    };

    private const string AppVersionLabel = "1.1.0";
}

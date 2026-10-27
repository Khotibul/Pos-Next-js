using System.Printing;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Documents;
using System.Windows.Media;
using PosquDesktop.Models;

namespace PosquDesktop.Services;

public static class PrintHelper
{
    public static void Print(Sale sale, string storeName, string? printerName, bool silent)
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

        if (!silent || dialog.PrintQueue == null)
        {
            if (dialog.ShowDialog() != true) return;
        }

        var document = BuildDocument(sale, storeName);
        var paginator = ((IDocumentPaginatorSource)document).DocumentPaginator;
        dialog.PrintDocument(paginator, "Struk " + sale.InvoiceNo);
    }

    private static FlowDocument BuildDocument(Sale sale, string storeName)
    {
        var document = new FlowDocument
        {
            FontFamily = new FontFamily("Consolas"),
            FontSize = 10,
            PageWidth = 302,
            PageHeight = 1200,
            ColumnWidth = 278,
            PagePadding = new Thickness(10),
            Foreground = Brushes.Black
        };

        document.Blocks.Add(new Paragraph(new Run(storeName))
        {
            FontFamily = new FontFamily("Segoe UI"),
            FontSize = 14,
            FontWeight = FontWeights.Bold,
            TextAlignment = TextAlignment.Center,
            Margin = new Thickness(0, 0, 0, 2)
        });
        document.Blocks.Add(new Paragraph(new Run("Struk Penjualan"))
        {
            FontSize = 9,
            TextAlignment = TextAlignment.Center,
            Foreground = Brushes.DimGray,
            Margin = new Thickness(0, 0, 0, 6)
        });
        document.Blocks.Add(Separator());

        AddLine(document, $"No. Invoice : {sale.InvoiceNo}");
        AddLine(document, $"Tanggal     : {sale.CreatedAt:dd/MM/yyyy HH:mm}");
        AddLine(document, $"Kasir       : {AppServices.Current.User.Name}");
        if (!string.IsNullOrWhiteSpace(sale.CustomerName))
            AddLine(document, $"Pelanggan   : {sale.CustomerName}");
        document.Blocks.Add(Separator());

        var table = new Table { CellSpacing = 0, Margin = new Thickness(0) };
        table.Columns.Add(new TableColumn { Width = new GridLength(190) });
        table.Columns.Add(new TableColumn { Width = new GridLength(78) });
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
        document.Blocks.Add(Separator());

        AddLine(document, FormatTotal("Subtotal", sale.Subtotal));
        if (sale.Discount > 0)
            AddLine(document, FormatTotal("Diskon", -sale.Discount));
        if (sale.Tax > 0)
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

        document.Blocks.Add(Separator());
        document.Blocks.Add(new Paragraph(new Run("Terima kasih telah berbelanja"))
        {
            TextAlignment = TextAlignment.Center,
            FontSize = 9,
            Margin = new Thickness(0, 4, 0, 2)
        });
        document.Blocks.Add(new Paragraph(new Run("Barang yang sudah dibeli tidak dapat ditukar"))
        {
            TextAlignment = TextAlignment.Center,
            FontSize = 8,
            Foreground = Brushes.DimGray,
            Margin = new Thickness(0)
        });

        return document;
    }

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

    private static Paragraph Separator() => new(new Run("------------------------------------------"))
    {
        TextAlignment = TextAlignment.Center,
        Foreground = Brushes.Gray,
        Margin = new Thickness(0, 5, 0, 5),
        FontSize = 9
    };
}

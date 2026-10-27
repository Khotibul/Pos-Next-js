using System.Collections.ObjectModel;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using PosquDesktop.Services;
using PosquDesktop.Views.Dialogs;

namespace PosquDesktop.ViewModels;

public sealed class LedgerRow
{
    public string Id { get; init; } = "";
    public string Name { get; init; } = "";
    public string InvoiceNo { get; init; } = "";
    public string? Description { get; init; }
    public decimal TotalAmount { get; init; }
    public decimal PaidAmount { get; init; }
    public decimal RemainingAmount { get; init; }
    public string DueDateLabel { get; init; } = "-";
    public string StatusLabel { get; init; } = "";
    public string CreatedLabel { get; init; } = "";
}

public partial class LedgerViewModel : ViewModelBase
{
    private readonly AppServices _services;
    private readonly bool _isReceivable;

    [ObservableProperty] private string searchText = "";
    [ObservableProperty] private int rowCount;
    [ObservableProperty] private decimal totalOutstanding;
    [ObservableProperty] private decimal totalPaid;
    [ObservableProperty] private LedgerRow? selectedRow;

    public ObservableCollection<LedgerRow> Rows { get; } = new();
    public string PageTitle => _isReceivable ? "Piutang Pelanggan" : "Utang Supplier";
    public string NameHeader => _isReceivable ? "Pelanggan" : "Supplier";
    public string SearchPlaceholder => _isReceivable ? "Cari pelanggan / invoice…" : "Cari supplier / invoice…";
    public string TotalOutstandingText => Formatters.Rupiah(TotalOutstanding);

    partial void OnTotalOutstandingChanged(decimal value) => OnPropertyChanged(nameof(TotalOutstandingText));

    public LedgerViewModel(AppServices services, bool isReceivable)
    {
        _services = services;
        _isReceivable = isReceivable;
    }

    public override Task LoadAsync() => RunAsync(LoadCoreAsync);

    private async Task LoadCoreAsync()
    {
        var search = string.IsNullOrWhiteSpace(SearchText) ? null : SearchText.Trim();
        Rows.Clear();

        if (_isReceivable)
        {
            var rows = await _services.Api.GetReceivablesAsync(null, search);
            foreach (var r in rows)
            {
                Rows.Add(new LedgerRow
                {
                    Id = r.Id,
                    Name = r.CustomerName ?? "-",
                    InvoiceNo = r.InvoiceNo,
                    Description = r.Description,
                    TotalAmount = r.TotalAmount,
                    PaidAmount = r.PaidAmount,
                    RemainingAmount = r.RemainingAmount,
                    DueDateLabel = r.DueDateLabel,
                    StatusLabel = r.StatusLabel,
                    CreatedLabel = Formatters.DateShort(r.CreatedAt)
                });
            }
        }
        else
        {
            var rows = await _services.Api.GetPayablesAsync(null, search);
            foreach (var r in rows)
            {
                Rows.Add(new LedgerRow
                {
                    Id = r.Id,
                    Name = r.SupplierName ?? "-",
                    InvoiceNo = r.InvoiceNo,
                    Description = r.Description,
                    TotalAmount = r.TotalAmount,
                    PaidAmount = r.PaidAmount,
                    RemainingAmount = r.RemainingAmount,
                    DueDateLabel = r.DueDateLabel,
                    StatusLabel = r.StatusLabel,
                    CreatedLabel = Formatters.DateShort(r.CreatedAt)
                });
            }
        }

        RowCount = Rows.Count;
        TotalOutstanding = Rows.Sum(r => r.RemainingAmount);
        TotalPaid = Rows.Sum(r => r.PaidAmount);
    }

    [RelayCommand]
    private async Task SearchAsync() => await RefreshAsync();

    [RelayCommand]
    private async Task PayAsync(LedgerRow? row)
    {
        row ??= SelectedRow;
        if (row == null || row.RemainingAmount <= 0) return;

        var values = FormDialog.Show(
            System.Windows.Application.Current.MainWindow,
            _isReceivable ? "Terima Pembayaran Piutang" : "Bayar Utang Supplier",
            $"{row.Name} - {row.InvoiceNo} (sisa {Formatters.Rupiah(row.RemainingAmount)})",
            new List<FormField>
            {
                new()
                {
                    Key = "amount",
                    Label = "Jumlah bayar (Rp)",
                    Required = true,
                    Value = row.RemainingAmount.ToString("0")
                },
                new()
                {
                    Key = "method",
                    Label = "Metode pembayaran",
                    Options = new List<FormOption>
                    {
                        new("CASH", "Tunai"),
                        new("CARD", "Kartu"),
                        new("QRIS", "QRIS"),
                        new("TRANSFER", "Transfer"),
                        new("EWALLET", "E-Wallet")
                    },
                    Value = "CASH"
                },
                new() { Key = "reference", Label = "No. referensi (opsional)" },
                new() { Key = "notes", Label = "Catatan (opsional)", Multiline = true }
            },
            _isReceivable ? "Simpan Pembayaran" : "Simpan Pembayaran");
        if (values == null) return;

        var amount = Formatters.ParseMoney(values["amount"]);
        if (amount <= 0)
        {
            ErrorMessage = "Jumlah pembayaran harus lebih dari nol.";
            return;
        }
        if (amount > row.RemainingAmount)
        {
            ErrorMessage = $"Jumlah pembayaran melebihi sisa tagihan {Formatters.Rupiah(row.RemainingAmount)}.";
            return;
        }

        await RunAsync(async () =>
        {
            if (_isReceivable)
                await _services.Api.RecordReceivablePaymentAsync(row.Id, amount, values["method"],
                    values["reference"], values["notes"]);
            else
                await _services.Api.RecordPayablePaymentAsync(row.Id, amount, values["method"],
                    values["reference"], values["notes"]);

            StatusMessage = $"Pembayaran {Formatters.Rupiah(amount)} berhasil disimpan.";
            await LoadCoreAsync();
        });
    }
}

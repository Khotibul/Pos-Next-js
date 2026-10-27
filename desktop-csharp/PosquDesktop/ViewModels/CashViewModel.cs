using System.Collections.ObjectModel;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using PosquDesktop.Models;
using PosquDesktop.Services;
using PosquDesktop.Views.Dialogs;

namespace PosquDesktop.ViewModels;

public partial class CashViewModel : ViewModelBase
{
    private readonly AppServices _services;
    private readonly List<CashTransaction> _all = new();
    private CashierShift? _openShift;

    [ObservableProperty] private string typeFilter = "Semua";
    [ObservableProperty] private decimal totalIn;
    [ObservableProperty] private decimal totalOut;
    [ObservableProperty] private string shiftLabel = "Tanpa shift aktif";

    public ObservableCollection<CashTransaction> Transactions { get; } = new();
    public IReadOnlyList<string> TypeFilters { get; } = new[] { "Semua", "Masuk", "Keluar" };
    public decimal Balance => TotalIn - TotalOut;
    public string TotalInText => Formatters.Rupiah(TotalIn);
    public string TotalOutText => Formatters.Rupiah(TotalOut);
    public string BalanceText => Formatters.Rupiah(Balance);
    public bool IsEmpty => Transactions.Count == 0;

    partial void OnTypeFilterChanged(string value) => ApplyFilter();
    partial void OnTotalInChanged(decimal value) => NotifySummary();
    partial void OnTotalOutChanged(decimal value) => NotifySummary();

    private void NotifySummary()
    {
        OnPropertyChanged(nameof(TotalInText));
        OnPropertyChanged(nameof(TotalOutText));
        OnPropertyChanged(nameof(BalanceText));
    }

    public CashViewModel(AppServices services)
    {
        _services = services;
    }

    public override Task LoadAsync() => RunAsync(RefreshDataAsync);

    private async Task RefreshDataAsync()
    {
        var transactionsTask = _services.Api.GetCashTransactionsAsync(500);
        var shiftsTask = _services.Api.GetShiftsAsync("OPEN", _services.User.Id, 5);
        await Task.WhenAll(transactionsTask, shiftsTask);

        _all.Clear();
        _all.AddRange(await transactionsTask);
        _openShift = (await shiftsTask).FirstOrDefault();
        ShiftLabel = _openShift == null
            ? "Tanpa shift aktif — transaksi kas tetap tercatat"
            : $"Shift aktif sejak {_openShift.OpenedAt:HH:mm}";

        ApplyFilter();
    }

    private void ApplyFilter()
    {
        Transactions.Clear();
        var selected = TypeFilter switch
        {
            "Masuk" => "IN",
            "Keluar" => "OUT",
            _ => null
        };
        foreach (var transaction in _all
                     .Where(t => selected == null || t.Type.Equals(selected, StringComparison.OrdinalIgnoreCase))
                     .OrderByDescending(t => t.TransactionDate))
        {
            Transactions.Add(transaction);
        }

        TotalIn = _all.Where(t => t.Type.Equals("IN", StringComparison.OrdinalIgnoreCase)).Sum(t => t.Amount);
        TotalOut = _all.Where(t => t.Type.Equals("OUT", StringComparison.OrdinalIgnoreCase)).Sum(t => t.Amount);
        OnPropertyChanged(nameof(IsEmpty));
    }

    [RelayCommand]
    private async Task AddAsync()
    {
        var categories = new List<FormOption>
        {
            new("OPERASIONAL", "Operasional"),
            new("MODAL", "Modal / setoran"),
            new("PEMBELIAN", "Pembelian"),
            new("PENJUALAN", "Penjualan"),
            new("LAINNYA", "Lainnya")
        };

        var values = FormDialog.Show(
            System.Windows.Application.Current.MainWindow,
            "Catat Transaksi Kas",
            "Masukkan uang masuk atau keluar dari laci kasir.",
            new List<FormField>
            {
                new()
                {
                    Key = "type",
                    Label = "Jenis transaksi",
                    Options = new List<FormOption> { new("IN", "Kas masuk"), new("OUT", "Kas keluar") }
                },
                new() { Key = "category", Label = "Kategori", Options = categories },
                new() { Key = "amount", Label = "Jumlah (Rp)", Required = true, Value = "0" },
                new() { Key = "description", Label = "Keterangan", Multiline = true }
            },
            "Simpan Transaksi");
        if (values == null) return;

        var amount = Formatters.ParseMoney(values["amount"]);
        if (amount <= 0)
        {
            ErrorMessage = "Jumlah kas harus lebih dari nol.";
            return;
        }

        await RunAsync(async () =>
        {
            await _services.Api.CreateCashTransactionAsync(new
            {
                id = Guid.NewGuid().ToString(),
                shiftId = _openShift?.Id,
                type = values["type"],
                category = values["category"],
                amount,
                description = string.IsNullOrWhiteSpace(values["description"]) ? null : values["description"].Trim(),
                transactionDate = DateTime.Now.ToString("O"),
                userId = _services.User.Id
            });
            StatusMessage = "Transaksi kas berhasil dicatat.";
            await RefreshDataAsync();
        });
    }
}

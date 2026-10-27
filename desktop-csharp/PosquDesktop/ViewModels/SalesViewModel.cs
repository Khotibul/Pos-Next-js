using System.Collections.ObjectModel;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using PosquDesktop.Models;
using PosquDesktop.Services;
using PosquDesktop.Views.Dialogs;

namespace PosquDesktop.ViewModels;

public partial class SalesViewModel : ViewModelBase
{
    private readonly AppServices _services;

    [ObservableProperty] private DateTime? startDate = DateTime.Today.AddDays(-6);
    [ObservableProperty] private DateTime? endDate = DateTime.Today;
    [ObservableProperty] private string searchText = "";
    [ObservableProperty] private Sale? selectedSale;
    [ObservableProperty] private int transactionCount;
    [ObservableProperty] private decimal totalSales;
    [ObservableProperty] private decimal averageSale;

    public ObservableCollection<Sale> Sales { get; } = new();
    public ObservableCollection<SaleItem> DetailItems { get; } = new();
    public string TotalSalesText => Formatters.Rupiah(TotalSales);
    public string AverageSaleText => Formatters.Rupiah(AverageSale);
    public bool HasSelection => SelectedSale != null;
    public bool CanDelete => _services.User.Role.ToUpperInvariant() is "OWNER" or "ADMIN" or "SUPER_ADMIN";

    partial void OnTotalSalesChanged(decimal value) => OnPropertyChanged(nameof(TotalSalesText));
    partial void OnAverageSaleChanged(decimal value) => OnPropertyChanged(nameof(AverageSaleText));
    partial void OnSelectedSaleChanged(Sale? value)
    {
        DetailItems.Clear();
        if (value?.Items != null)
        {
            foreach (var item in value.Items) DetailItems.Add(item);
        }
        OnPropertyChanged(nameof(HasSelection));
    }

    public SalesViewModel(AppServices services)
    {
        _services = services;
    }

    public override Task LoadAsync() => RunAsync(LoadCoreAsync);

    private async Task LoadCoreAsync()
    {
        var start = StartDate?.Date;
        var end = EndDate?.Date.AddDays(1).AddTicks(-1);
        var sales = await _services.Api.GetSalesAsync(
            start, end, SearchText, limit: 500);

        Sales.Clear();
        foreach (var sale in sales) Sales.Add(sale);
        TransactionCount = sales.Count;
        TotalSales = sales.Sum(s => s.Total);
        AverageSale = sales.Count > 0 ? TotalSales / sales.Count : 0;
        SelectedSale = Sales.FirstOrDefault();
    }

    [RelayCommand]
    private async Task ApplyFiltersAsync()
    {
        if (StartDate.HasValue && EndDate.HasValue && StartDate > EndDate)
        {
            ErrorMessage = "Tanggal awal tidak boleh melebihi tanggal akhir.";
            return;
        }
        await RefreshAsync();
    }

    [RelayCommand]
    private void ShowReceipt(Sale? sale)
    {
        sale ??= SelectedSale;
        if (sale == null) return;
        var window = new ReceiptWindow(sale, _services.TenantName, _services.Store.Settings);
        window.Owner = System.Windows.Application.Current.MainWindow;
        window.ShowDialog();
    }

    [RelayCommand]
    private async Task DeleteAsync(Sale? sale)
    {
        sale ??= SelectedSale;
        if (sale == null) return;
        if (!Confirm($"Hapus transaksi {sale.InvoiceNo}?\nStok produk akan dikembalikan dan data piutang terkait ikut dihapus.",
                "Hapus Transaksi"))
            return;

        await RunAsync(async () =>
        {
            await _services.Api.DeleteSaleAsync(sale.Id);
            StatusMessage = $"Transaksi {sale.InvoiceNo} dihapus.";
            await LoadCoreAsync();
        });
    }
}

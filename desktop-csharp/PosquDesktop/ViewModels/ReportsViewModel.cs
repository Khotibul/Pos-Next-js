using System.Collections.ObjectModel;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using PosquDesktop.Models;
using PosquDesktop.Services;

namespace PosquDesktop.ViewModels;

public sealed class TopProductRow
{
    public int Rank { get; init; }
    public string Name { get; init; } = "";
    public string Sku { get; init; } = "";
    public decimal Qty { get; init; }
    public decimal Revenue { get; init; }
    public string RevenueText => Formatters.Rupiah(Revenue);
    public string QtyText => Formatters.Number(Qty);
}

public sealed class PaymentRow
{
    public string Method { get; init; } = "";
    public int Count { get; init; }
    public decimal Total { get; init; }
    public string TotalText => Formatters.Rupiah(Total);
}

public sealed class DailyRow
{
    public string DateLabel { get; init; } = "";
    public decimal Total { get; init; }
    public double BarHeight { get; init; }
    public string TotalText => Formatters.Rupiah(Total);
}

public partial class ReportsViewModel : ViewModelBase
{
    private readonly AppServices _services;

    [ObservableProperty] private DateTime? startDate = new DateTime(DateTime.Today.Year, DateTime.Today.Month, 1);
    [ObservableProperty] private DateTime? endDate = DateTime.Today;
    [ObservableProperty] private decimal totalRevenue;
    [ObservableProperty] private int transactionCount;
    [ObservableProperty] private decimal averageSale;
    [ObservableProperty] private decimal itemsSold;
    [ObservableProperty] private string rangeNote = "";

    public ObservableCollection<TopProductRow> TopProducts { get; } = new();
    public ObservableCollection<PaymentRow> Payments { get; } = new();
    public ObservableCollection<DailyRow> Daily { get; } = new();

    public string TotalRevenueText => Formatters.Rupiah(TotalRevenue);
    public string AverageSaleText => Formatters.Rupiah(AverageSale);
    public string ItemsSoldText => Formatters.Number(ItemsSold);
    public bool HasData => TransactionCount > 0;

    partial void OnTotalRevenueChanged(decimal value) => OnPropertyChanged(nameof(TotalRevenueText));
    partial void OnAverageSaleChanged(decimal value) => OnPropertyChanged(nameof(AverageSaleText));
    partial void OnItemsSoldChanged(decimal value) => OnPropertyChanged(nameof(ItemsSoldText));
    partial void OnTransactionCountChanged(int value) => OnPropertyChanged(nameof(HasData));

    public ReportsViewModel(AppServices services)
    {
        _services = services;
    }

    public override Task LoadAsync() => RunAsync(LoadCoreAsync);

    private async Task LoadCoreAsync()
    {
        var start = StartDate?.Date ?? DateTime.Today.AddDays(-29);
        var end = (EndDate?.Date ?? DateTime.Today).AddDays(1).AddTicks(-1);
        var sales = await _services.Api.GetSalesAsync(start, end, null, 500);

        TotalRevenue = sales.Sum(s => s.Total);
        TransactionCount = sales.Count;
        AverageSale = sales.Count > 0 ? TotalRevenue / sales.Count : 0;
        ItemsSold = sales.SelectMany(s => s.Items).Sum(i => i.Qty);
        RangeNote = sales.Count >= 500
            ? "Menampilkan maksimal 500 transaksi terbaru pada rentang ini."
            : $"Periode {start:dd/MM/yyyy} – {(EndDate?.Date ?? DateTime.Today):dd/MM/yyyy}";

        TopProducts.Clear();
        var top = sales
            .SelectMany(s => s.Items)
            .GroupBy(i => new { i.ProductId, i.Name, i.Sku })
            .Select(g => new
            {
                g.Key.Name,
                g.Key.Sku,
                Qty = g.Sum(i => i.Qty),
                Revenue = g.Sum(i => i.LineTotal)
            })
            .OrderByDescending(x => x.Revenue)
            .Take(10)
            .ToList();
        var rank = 1;
        foreach (var item in top)
        {
            TopProducts.Add(new TopProductRow
            {
                Rank = rank++,
                Name = item.Name,
                Sku = item.Sku,
                Qty = item.Qty,
                Revenue = item.Revenue
            });
        }

        Payments.Clear();
        foreach (var group in sales
                     .GroupBy(s => s.PaymentMethod, StringComparer.OrdinalIgnoreCase)
                     .OrderByDescending(g => g.Sum(s => s.Total)))
        {
            Payments.Add(new PaymentRow
            {
                Method = group.First().PaymentLabel,
                Count = group.Count(),
                Total = group.Sum(s => s.Total)
            });
        }

        Daily.Clear();
        var dayGroups = sales
            .GroupBy(s => s.CreatedAt.Date)
            .ToDictionary(g => g.Key, g => g.Sum(s => s.Total));
        var days = new List<DateTime>();
        for (var date = start.Date; date <= (EndDate?.Date ?? DateTime.Today); date = date.AddDays(1))
            days.Add(date);
        if (days.Count > 62) days = days.TakeLast(62).ToList();
        var max = days.Select(d => dayGroups.GetValueOrDefault(d)).DefaultIfEmpty(0).Max();
        foreach (var day in days)
        {
            var total = dayGroups.GetValueOrDefault(day);
            Daily.Add(new DailyRow
            {
                DateLabel = day.ToString("dd/MM"),
                Total = total,
                BarHeight = max > 0 ? Math.Max(2, (double)(total / max) * 140) : 2
            });
        }
    }

    [RelayCommand]
    private async Task ApplyAsync()
    {
        if (StartDate.HasValue && EndDate.HasValue && StartDate > EndDate)
        {
            ErrorMessage = "Tanggal awal tidak boleh melebihi tanggal akhir.";
            return;
        }
        await RefreshAsync();
    }
}

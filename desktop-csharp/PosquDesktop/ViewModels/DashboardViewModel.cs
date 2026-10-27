using System.Collections.ObjectModel;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using PosquDesktop.Models;
using PosquDesktop.Services;

namespace PosquDesktop.ViewModels;

public partial class DashboardViewModel : ViewModelBase
{
    private readonly AppServices _services;
    private readonly Action<string?> _navigate;

    [ObservableProperty] private decimal todaySales;
    [ObservableProperty] private int todayTransactions;
    [ObservableProperty] private decimal averageSale;
    [ObservableProperty] private int productCount;
    [ObservableProperty] private int lowStockCount;
    [ObservableProperty] private string openShiftLabel = "Tidak ada shift terbuka";
    [ObservableProperty] private string lastUpdated = "-";

    public ObservableCollection<Sale> RecentSales { get; } = new();
    public ObservableCollection<Product> LowStockProducts { get; } = new();
    public ObservableCollection<DailyRow> Weekly { get; } = new();

    public string TodaySalesText => Formatters.Rupiah(TodaySales);
    public string AverageSaleText => Formatters.Rupiah(AverageSale);
    public string UserGreeting => $"Halo, {_services.User.Name.Split(' ').FirstOrDefault() ?? "Kasir"}";
    public string StoreName => _services.TenantName;
    public string PlanLabel => _services.PlanLabel;

    partial void OnTodaySalesChanged(decimal value) => OnPropertyChanged(nameof(TodaySalesText));
    partial void OnAverageSaleChanged(decimal value) => OnPropertyChanged(nameof(AverageSaleText));

    public DashboardViewModel(AppServices services, Action<string?> navigate)
    {
        _services = services;
        _navigate = navigate;
    }

    [RelayCommand]
    private void GoTo(string? key) => _navigate(key);

    public override async Task LoadAsync()
    {
        var now = DateTime.Now;
        var start = now.Date;
        var weekStart = start.AddDays(-6);

        await RunAsync(async () =>
        {
            var salesTask = _services.Api.GetSalesAsync(weekStart, now, limit: 500);
            var productsTask = _services.Api.GetProductsAsync(null, 1, 500);
            var shiftsTask = _services.Api.GetShiftsAsync("OPEN", _services.User.Id, 10);

            await Task.WhenAll(salesTask, productsTask, shiftsTask);

            var weekSales = await salesTask;
            var sales = weekSales.Where(s => s.CreatedAt.Date == start).ToList();
            var products = await productsTask;
            var shifts = await shiftsTask;

            TodaySales = sales.Sum(s => s.Total);
            TodayTransactions = sales.Count;
            AverageSale = sales.Count > 0 ? TodaySales / sales.Count : 0;

            Weekly.Clear();
            var byDay = weekSales
                .GroupBy(s => s.CreatedAt.Date)
                .ToDictionary(g => g.Key, g => g.Sum(s => s.Total));
            var max = Enumerable.Range(0, 7)
                .Select(i => byDay.GetValueOrDefault(weekStart.AddDays(i)))
                .DefaultIfEmpty(0)
                .Max();
            for (var i = 0; i < 7; i++)
            {
                var day = weekStart.AddDays(i);
                var total = byDay.GetValueOrDefault(day);
                Weekly.Add(new DailyRow
                {
                    DateLabel = day.ToString("ddd").Replace(".", ""),
                    Total = total,
                    BarHeight = max > 0 ? Math.Max(3, (double)(total / max) * 78) : 3
                });
            }

            ProductCount = products.Count;
            var lowStock = products
                .Where(p => p.IsActive && (p.MinStock > 0 ? p.Stock <= p.MinStock : p.Stock <= 0))
                .OrderBy(p => p.Stock)
                .Take(12)
                .ToList();
            LowStockCount = lowStock.Count;
            LowStockProducts.Clear();
            foreach (var product in lowStock) LowStockProducts.Add(product);

            RecentSales.Clear();
            foreach (var sale in sales.Take(7)) RecentSales.Add(sale);

            var shift = shifts.FirstOrDefault();
            OpenShiftLabel = shift == null
                ? "Tidak ada shift terbuka"
                : $"Shift buka sejak {shift.OpenedAt:HH:mm}";
            LastUpdated = DateTime.Now.ToString("HH:mm:ss");
        });
    }
}

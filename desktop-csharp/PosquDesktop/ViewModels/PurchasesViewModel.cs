using System.Collections.ObjectModel;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using PosquDesktop.Models;
using PosquDesktop.Services;
using PosquDesktop.Views.Dialogs;

namespace PosquDesktop.ViewModels;

public partial class PurchasesViewModel : ViewModelBase
{
    private readonly AppServices _services;
    private List<PurchaseOrder> _all = new();
    private List<Supplier> _suppliers = new();
    private readonly List<PurchaseOrder> _allOrders = new();

    [ObservableProperty] private string searchText = "";
    [ObservableProperty] private string statusFilter = "Semua";
    [ObservableProperty] private PurchaseOrder? selectedOrder;
    [ObservableProperty] private int totalCount;
    [ObservableProperty] private int draftCount;
    [ObservableProperty] private int orderedCount;
    [ObservableProperty] private decimal totalValue;

    public ObservableCollection<PurchaseOrder> Orders { get; } = new();
    public IReadOnlyList<string> StatusFilters { get; } = new[] { "Semua", "DRAFT", "ORDERED", "RECEIVED", "CANCELED" };
    public string TotalValueText => Formatters.Rupiah(TotalValue);
    public bool IsEmpty => Orders.Count == 0;

    partial void OnSearchTextChanged(string value) => ApplyFilter();
    partial void OnStatusFilterChanged(string value) => ApplyFilter();
    partial void OnTotalValueChanged(decimal value) => OnPropertyChanged(nameof(TotalValueText));

    public PurchasesViewModel(AppServices services)
    {
        _services = services;
    }

    public override Task LoadAsync() => RunAsync(RefreshDataAsync);

    private async Task RefreshDataAsync()
    {
        var purchasesTask = _services.Api.GetPurchaseOrdersAsync();
        var suppliersTask = _services.Api.GetSuppliersAsync();
        await Task.WhenAll(purchasesTask, suppliersTask);

        _all = await purchasesTask;
        _suppliers = await suppliersTask;

        TotalCount = _all.Count;
        DraftCount = _all.Count(o => o.Status.Equals("DRAFT", StringComparison.OrdinalIgnoreCase));
        OrderedCount = _all.Count(o => o.Status.Equals("ORDERED", StringComparison.OrdinalIgnoreCase));
        TotalValue = _all.Where(o => !o.Status.Equals("CANCELED", StringComparison.OrdinalIgnoreCase)).Sum(o => o.Total);
        ApplyFilter();
    }

    private void ApplyFilter()
    {
        var search = SearchText.Trim().ToLowerInvariant();
        var status = StatusFilter == "Semua" ? null : StatusFilter;

        Orders.Clear();
        foreach (var order in _all
                     .Where(o => status == null || o.Status.Equals(status, StringComparison.OrdinalIgnoreCase))
                     .Where(o => search.Length == 0 ||
                                 o.OrderNo.ToLowerInvariant().Contains(search) ||
                                 (o.SupplierName ?? "").ToLowerInvariant().Contains(search) ||
                                 (o.Notes ?? "").ToLowerInvariant().Contains(search))
                     .OrderByDescending(o => o.CreatedAt))
        {
            Orders.Add(order);
        }
        OnPropertyChanged(nameof(IsEmpty));
    }

    [RelayCommand]
    private async Task AddAsync()
    {
        var values = ShowEditor(null);
        if (values == null) return;
        var order = BuildOrder(values, new PurchaseOrder
        {
            Id = Guid.NewGuid().ToString(),
            CreatedAt = DateTime.Now
        });
        await RunAsync(async () =>
        {
            await _services.Api.SavePurchaseOrderAsync(order);
            StatusMessage = $"Purchase order {order.OrderNo} berhasil dibuat.";
            await RefreshDataAsync();
        });
    }

    [RelayCommand]
    private async Task EditAsync(PurchaseOrder? order)
    {
        order ??= SelectedOrder;
        if (order == null) return;
        var values = ShowEditor(order);
        if (values == null) return;
        var updated = BuildOrder(values, order);
        await RunAsync(async () =>
        {
            await _services.Api.SavePurchaseOrderAsync(updated);
            StatusMessage = $"Purchase order {updated.OrderNo} berhasil diperbarui.";
            await RefreshDataAsync();
        });
    }

    private Dictionary<string, string>? ShowEditor(PurchaseOrder? order)
    {
        var supplierOptions = new List<FormOption> { new("", "Tanpa supplier") };
        supplierOptions.AddRange(_suppliers
            .Where(s => s.IsActive)
            .OrderBy(s => s.Name)
            .Select(s => new FormOption(s.Id, s.Name)));

        var values = FormDialog.Show(
            System.Windows.Application.Current.MainWindow,
            order == null ? "Buat Purchase Order" : "Ubah Purchase Order",
            order == null ? "Buat PO pembelian stok untuk supplier." : order.OrderNo,
            new List<FormField>
            {
                new() { Key = "orderNo", Label = "No. PO (opsional)", Value = order?.OrderNo },
                new()
                {
                    Key = "supplier",
                    Label = "Supplier",
                    Options = supplierOptions,
                    Value = order?.SupplierId ?? ""
                },
                new()
                {
                    Key = "status",
                    Label = "Status",
                    Options = new List<FormOption>
                    {
                        new("DRAFT", "Draft"),
                        new("ORDERED", "Dipesan"),
                        new("RECEIVED", "Diterima"),
                        new("CANCELED", "Dibatalkan")
                    },
                    Value = order?.Status ?? "DRAFT"
                },
                new() { Key = "notes", Label = "Catatan", Multiline = true, Value = order?.Notes }
            },
            order == null ? "Buat PO" : "Simpan Perubahan");
        return values;
    }

    private static PurchaseOrder BuildOrder(Dictionary<string, string> values, PurchaseOrder order)
    {
        var orderNo = values["orderNo"].Trim();
        order.OrderNo = string.IsNullOrWhiteSpace(orderNo)
            ? $"PO-{DateTime.Now:yyMMdd}-{Random.Shared.Next(1000, 9999)}"
            : orderNo;
        order.SupplierId = string.IsNullOrWhiteSpace(values["supplier"]) ? null : values["supplier"];
        order.SupplierName = null;
        order.Status = string.IsNullOrWhiteSpace(values["status"]) ? "DRAFT" : values["status"];
        order.Notes = string.IsNullOrWhiteSpace(values["notes"]) ? null : values["notes"].Trim();
        return order;
    }
}

using System.Collections.ObjectModel;
using System.Windows;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using PosquDesktop.Models;
using PosquDesktop.Services;
using PosquDesktop.Views.Dialogs;

namespace PosquDesktop.ViewModels;

public partial class ProductsViewModel : ViewModelBase
{
    private readonly AppServices _services;
    private readonly List<Product> _allProducts = new();
    private List<ProductCategory> _categories = new();
    private List<ProductUnit> _units = new();

    [ObservableProperty] private string searchText = "";
    [ObservableProperty] private string selectedCategoryFilter = "Semua Kategori";
    [ObservableProperty] private bool onlyLowStock;
    [ObservableProperty] private Product? selectedProduct;
    [ObservableProperty] private int totalCount;
    [ObservableProperty] private int activeCount;
    [ObservableProperty] private int lowStockCount;

    public ObservableCollection<Product> Products { get; } = new();
    public ObservableCollection<string> CategoryFilters { get; } = new() { "Semua Kategori" };

    public bool IsEmpty => Products.Count == 0;

    partial void OnSearchTextChanged(string value) => ApplyFilter();
    partial void OnSelectedCategoryFilterChanged(string value) => ApplyFilter();
    partial void OnOnlyLowStockChanged(bool value) => ApplyFilter();

    public ProductsViewModel(AppServices services)
    {
        _services = services;
    }

    public override async Task LoadAsync()
    {
        await RunAsync(async () =>
        {
            var productsTask = _services.Api.GetAllProductsAsync();
            var categoriesTask = _services.Api.GetCategoriesAsync();
            var unitsTask = _services.Api.GetUnitsAsync();
            await Task.WhenAll(productsTask, categoriesTask, unitsTask);

            _allProducts.Clear();
            _allProducts.AddRange(await productsTask);
            _categories = await categoriesTask;
            _units = await unitsTask;

            CategoryFilters.Clear();
            CategoryFilters.Add("Semua Kategori");
            foreach (var category in _categories.OrderBy(c => c.Name))
                CategoryFilters.Add(category.Name);
            if (!CategoryFilters.Contains(SelectedCategoryFilter))
                SelectedCategoryFilter = "Semua Kategori";

            TotalCount = _allProducts.Count;
            ActiveCount = _allProducts.Count(p => p.IsActive);
            LowStockCount = _allProducts.Count(IsLowStock);
            ApplyFilter();
        });
    }

    private static bool IsLowStock(Product p) =>
        p.IsActive && (p.MinStock > 0 ? p.Stock <= p.MinStock : p.Stock <= 0);

    private void ApplyFilter()
    {
        var search = SearchText.Trim().ToLowerInvariant();
        Products.Clear();
        foreach (var product in _allProducts
                     .Where(p => !OnlyLowStock || IsLowStock(p))
                     .Where(p => SelectedCategoryFilter == "Semua Kategori" ||
                                 string.Equals(p.CategoryName, SelectedCategoryFilter, StringComparison.OrdinalIgnoreCase))
                     .Where(p => search.Length == 0 ||
                                 p.Name.ToLowerInvariant().Contains(search) ||
                                 p.Sku.ToLowerInvariant().Contains(search) ||
                                 (p.Barcode ?? "").ToLowerInvariant().Contains(search))
                     .OrderBy(p => p.Name))
        {
            Products.Add(product);
        }
        OnPropertyChanged(nameof(IsEmpty));
    }

    [RelayCommand]
    private async Task AddAsync()
    {
        var values = ShowEditor(null);
        if (values == null) return;
        var product = BuildProduct(values, new Product { Id = Guid.NewGuid().ToString() });
        await RunAsync(async () =>
        {
            await _services.Api.CreateProductAsync(product);
            StatusMessage = "Produk baru berhasil disimpan.";
            await ReloadProductsAsync();
        });
    }

    [RelayCommand]
    private async Task EditAsync(Product? product)
    {
        product ??= SelectedProduct;
        if (product == null) return;
        var values = ShowEditor(product);
        if (values == null) return;
        var updated = BuildProduct(values, Clone(product));
        await RunAsync(async () =>
        {
            await _services.Api.UpdateProductAsync(updated);
            StatusMessage = $"Produk “{updated.Name}” diperbarui.";
            await ReloadProductsAsync();
        });
    }

    [RelayCommand]
    private async Task DeleteAsync(Product? product)
    {
        product ??= SelectedProduct;
        if (product == null) return;
        if (!Confirm($"Hapus produk “{product.Name}”? Tindakan ini tidak dapat dibatalkan.", "Hapus Produk"))
            return;

        await RunAsync(async () =>
        {
            await _services.Api.DeleteProductAsync(product.Id);
            StatusMessage = $"Produk “{product.Name}” dihapus.";
            await ReloadProductsAsync();
        });
    }

    private async Task ReloadProductsAsync()
    {
        var refreshed = await _services.Api.GetAllProductsAsync();
        _allProducts.Clear();
        _allProducts.AddRange(refreshed);
        TotalCount = _allProducts.Count;
        ActiveCount = _allProducts.Count(p => p.IsActive);
        LowStockCount = _allProducts.Count(IsLowStock);
        ApplyFilter();
    }

    private Dictionary<string, string>? ShowEditor(Product? product)
    {
        var isEdit = product != null;
        var categoryOptions = new List<FormOption> { new("", "(Tanpa kategori)") };
        categoryOptions.AddRange(_categories.OrderBy(c => c.Name).Select(c => new FormOption(c.Id, c.Name)));
        var unitOptions = new List<FormOption> { new("", "(Tanpa satuan)") };
        unitOptions.AddRange(_units.OrderBy(u => u.Name).Select(u => new FormOption(u.Id, u.Name)));

        var fields = new List<FormField>
        {
            new() { Key = "sku", Label = "SKU", Required = true, Value = product?.Sku },
            new() { Key = "name", Label = "Nama produk", Required = true, Value = product?.Name },
            new() { Key = "barcode", Label = "Barcode", Value = product?.Barcode },
            new() { Key = "category", Label = "Kategori", Options = categoryOptions, Value = product?.CategoryId ?? "" },
            new() { Key = "unit", Label = "Satuan", Options = unitOptions, Value = product?.UnitId ?? "" },
            new() { Key = "cost", Label = "Harga beli", Value = (product?.CostPrice ?? 0).ToString("0.##") },
            new() { Key = "selling", Label = "Harga jual", Required = true, Value = (product?.SellingPrice ?? 0).ToString("0.##") },
            new() { Key = "wholesale", Label = "Harga grosir", Value = (product?.WholesalePrice ?? 0).ToString("0.##") },
            new() { Key = "wholesaleMin", Label = "Minimal qty grosir", Value = (product?.WholesaleMinQty ?? 0).ToString("0") },
            new() { Key = "minStock", Label = "Stok minimum", Value = (product?.MinStock ?? 0).ToString("0") },
            new()
            {
                Key = "active",
                Label = "Status",
                Options = new List<FormOption> { new("1", "Aktif"), new("0", "Nonaktif") },
                Value = product == null || product.IsActive ? "1" : "0"
            },
            new() { Key = "description", Label = "Deskripsi", Multiline = true, Value = product?.Description }
        };

        return FormDialog.Show(
            System.Windows.Application.Current.MainWindow,
            isEdit ? "Ubah Produk" : "Tambah Produk",
            isEdit ? "Perubahan disimpan ke server." : "Produk baru akan langsung tersedia di semua perangkat.",
            fields,
            isEdit ? "Simpan Perubahan" : "Tambah Produk");
    }

    private static Product Clone(Product source) => new()
    {
        Id = source.Id,
        Sku = source.Sku,
        Barcode = source.Barcode,
        Name = source.Name,
        Description = source.Description,
        CategoryId = source.CategoryId,
        CategoryName = source.CategoryName,
        UnitId = source.UnitId,
        Unit = source.Unit,
        BrandId = source.BrandId,
        BrandName = source.BrandName,
        SupplierId = source.SupplierId,
        SupplierName = source.SupplierName,
        QrCode = source.QrCode,
        ImageUrl = source.ImageUrl,
        CostPrice = source.CostPrice,
        SellingPrice = source.SellingPrice,
        MarginPct = source.MarginPct,
        WholesalePrice = source.WholesalePrice,
        WholesaleDiscountPercent = source.WholesaleDiscountPercent,
        WholesaleMinQty = source.WholesaleMinQty,
        TaxRate = source.TaxRate,
        MinStock = source.MinStock,
        ReorderPoint = source.ReorderPoint,
        Weight = source.Weight,
        Volume = source.Volume,
        Stock = source.Stock,
        IsActive = source.IsActive,
        IsFeatured = source.IsFeatured,
        IsConsignment = source.IsConsignment,
        Type = source.Type,
        CreatedAt = source.CreatedAt,
        UpdatedAt = source.UpdatedAt
    };

    private static Product BuildProduct(Dictionary<string, string> values, Product product)
    {
        product.Sku = values["sku"].Trim();
        product.Name = values["name"].Trim();
        product.Barcode = string.IsNullOrWhiteSpace(values["barcode"]) ? null : values["barcode"].Trim();
        product.CategoryId = string.IsNullOrWhiteSpace(values["category"]) ? null : values["category"];
        product.UnitId = string.IsNullOrWhiteSpace(values["unit"]) ? null : values["unit"];
        product.CostPrice = Formatters.ParseMoney(values["cost"]);
        product.SellingPrice = Formatters.ParseMoney(values["selling"]);
        product.WholesalePrice = Formatters.ParseMoney(values["wholesale"]);
        product.WholesaleMinQty = Formatters.ParseMoney(values["wholesaleMin"]);
        product.MinStock = Formatters.ParseMoney(values["minStock"]);
        product.IsActive = values["active"] != "0";
        product.Description = string.IsNullOrWhiteSpace(values["description"]) ? null : values["description"].Trim();
        return product;
    }
}

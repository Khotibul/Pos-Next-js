using System.Windows;
using System.Collections.ObjectModel;
using System.ComponentModel;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using PosquDesktop.Models;
using PosquDesktop.Services;
using PosquDesktop.Views.Dialogs;

namespace PosquDesktop.ViewModels;

public partial class CartItem : ObservableObject
{
    public Product Product { get; }
    public ProductVariant? Variant { get; }
    [ObservableProperty] private int quantity = 1;
    [ObservableProperty] private decimal price;
    [ObservableProperty] private bool priceOverridden;

    public CartItem(Product product, ProductVariant? variant = null)
    {
        Product = product;
        Variant = variant;
        price = variant?.Price ?? product.SellingPrice;
    }

    public string Name => Variant == null ? Product.Name : $"{Product.Name} ({Variant.DisplayName})";
    public string Sku => Variant?.Sku ?? Product.Sku;
    public string UnitLabel => string.IsNullOrWhiteSpace(Product.Unit) ? "pcs" : Product.Unit!;
    public decimal Subtotal => Price * Quantity;
    public string SubtotalText => Formatters.Rupiah(Subtotal);
    public bool HasVariant => Variant != null;

    partial void OnQuantityChanged(int value)
    {
        OnPropertyChanged(nameof(Subtotal));
        OnPropertyChanged(nameof(SubtotalText));
    }

    partial void OnPriceChanged(decimal value)
    {
        OnPropertyChanged(nameof(Subtotal));
        OnPropertyChanged(nameof(SubtotalText));
    }
}

public partial class PosViewModel : ViewModelBase
{
    private static readonly string[] PaymentOptions = { "Tunai", "Kartu", "QRIS", "Transfer", "E-Wallet", "Kredit" };

    private readonly AppServices _services;
    private readonly List<Product> _allProducts = new();
    private CashierShift? _openShift;

    [ObservableProperty] private string searchText = "";
    [ObservableProperty] private string selectedCategory = "Semua Kategori";
    [ObservableProperty] private Customer? selectedCustomer;
    [ObservableProperty] private string selectedPayment = "Tunai";
    [ObservableProperty] private string paidText = "";
    [ObservableProperty] private string discountText = "0";
    [ObservableProperty] private string taxRateText = "11";
    [ObservableProperty] private DateTime? dueDate = DateTime.Today.AddDays(14);
    [ObservableProperty] private string note = "";
    [ObservableProperty] private decimal subtotal;
    [ObservableProperty] private decimal tax;
    [ObservableProperty] private decimal total;
    [ObservableProperty] private decimal changeAmount;
    [ObservableProperty] private string shiftLabel = "Memuat shift...";
    [ObservableProperty] private string lastInvoice = "";

    public ObservableCollection<Product> FilteredProducts { get; } = new();
    public ObservableCollection<CartItem> Cart { get; } = new();
    public ObservableCollection<Customer> Customers { get; } = new();
    public ObservableCollection<string> Categories { get; } = new();
    public IReadOnlyList<string> PaymentMethods => PaymentOptions;

    public string SubtotalText => Formatters.Rupiah(Subtotal);
    public string TotalText => Formatters.Rupiah(Total);
    public string TaxText => Formatters.Rupiah(Tax);
    public bool HasTax => Tax > 0;
    public string ChangeText => Formatters.Rupiah(ChangeAmount);
    public string DiscountLabel => Formatters.Rupiah(ParseDiscount());
    public string CartCountText => $"{Cart.Sum(c => c.Quantity)} item";
    public bool HasCart => Cart.Count > 0;
    public bool IsCashPayment => SelectedPayment == "Tunai";
    public bool IsCreditPayment => SelectedPayment == "Kredit";
    public string CashierName => _services.User.Name;
    public bool CanEditPrice
    {
        get
        {
            var role = _services.User.Role?.ToUpperInvariant();
            return role is "OWNER" or "ADMIN" or "SUPER_ADMIN";
        }
    }

    partial void OnSearchTextChanged(string value) => ApplyFilter();
    partial void OnSelectedCategoryChanged(string value) => ApplyFilter();
    partial void OnSubtotalChanged(decimal value) => OnPropertyChanged(nameof(SubtotalText));
    partial void OnTaxChanged(decimal value)
    {
        OnPropertyChanged(nameof(TaxText));
        OnPropertyChanged(nameof(HasTax));
    }
    partial void OnTotalChanged(decimal value) => OnPropertyChanged(nameof(TotalText));
    partial void OnChangeAmountChanged(decimal value) => OnPropertyChanged(nameof(ChangeText));
    partial void OnDiscountTextChanged(string value) => RecalculateTotals();
    partial void OnTaxRateTextChanged(string value) => RecalculateTotals();
    partial void OnPaidTextChanged(string value) => RecalculateTotals();

    partial void OnSelectedCustomerChanged(Customer? value)
    {
        foreach (var item in Cart)
        {
            if (item.PriceOverridden) continue;
            item.Price = PriceFor(item.Product, item.Quantity, item.Variant);
        }
        RecalculateTotals();
    }

    partial void OnSelectedPaymentChanged(string value)
    {
        if (value != "Tunai")
            PaidText = value == "Kredit" ? "0" : Total.ToString("0");
        if (value == "Kredit" && DueDate == null)
            DueDate = DateTime.Today.AddDays(14);
        OnPropertyChanged(nameof(IsCashPayment));
        OnPropertyChanged(nameof(IsCreditPayment));
        RecalculateTotals();
    }

    public PosViewModel(AppServices services)
    {
        _services = services;
        Cart.CollectionChanged += (_, _) =>
        {
            OnPropertyChanged(nameof(HasCart));
            OnPropertyChanged(nameof(CartCountText));
        };
    }

    public override async Task LoadAsync()
    {
        await RunAsync(async () =>
        {
            var productsTask = _services.Api.GetAllProductsAsync();
            var categoriesTask = _services.Api.GetCategoriesAsync();
            var customersTask = _services.Api.GetCustomersAsync();
            var shiftsTask = _services.Api.GetShiftsAsync("OPEN", _services.User.Id, 5);
            await Task.WhenAll(productsTask, categoriesTask, customersTask, shiftsTask);

            _allProducts.Clear();
            _allProducts.AddRange(await productsTask);

            Categories.Clear();
            Categories.Add("Semua Kategori");
            foreach (var category in (await categoriesTask).OrderBy(c => c.Name))
                Categories.Add(category.Name);
            if (!Categories.Contains(SelectedCategory)) SelectedCategory = "Semua Kategori";

            var selectedCustomerId = SelectedCustomer?.Id;
            Customers.Clear();
            Customers.Add(new Customer { Id = "", Name = "(Tanpa pelanggan)" });
            foreach (var customer in await customersTask) Customers.Add(customer);
            SelectedCustomer = Customers.FirstOrDefault(c => c.Id == selectedCustomerId) ?? Customers[0];

            _openShift = (await shiftsTask).FirstOrDefault();
            ShiftLabel = _openShift == null
                ? "Belum ada shift terbuka"
                : $"Shift aktif sejak {_openShift.OpenedAt:HH:mm}";

            ApplyFilter();
        });
    }

    private void ApplyFilter()
    {
        var search = SearchText.Trim().ToLowerInvariant();
        FilteredProducts.Clear();
        foreach (var product in _allProducts
                     .Where(p => p.IsActive)
                     .Where(p => SelectedCategory == "Semua Kategori" ||
                                 string.Equals(p.CategoryName, SelectedCategory, StringComparison.OrdinalIgnoreCase))
                     .Where(p => search.Length == 0 ||
                                 p.Name.ToLowerInvariant().Contains(search) ||
                                 p.Sku.ToLowerInvariant().Contains(search) ||
                                 (p.Barcode ?? "").ToLowerInvariant().Contains(search) ||
                                 p.Variants.Any(v =>
                                     v.Name.ToLowerInvariant().Contains(search) ||
                                     v.Sku.ToLowerInvariant().Contains(search) ||
                                     (v.Barcode ?? "").ToLowerInvariant().Contains(search)))
                     .OrderBy(p => p.Name))
        {
            FilteredProducts.Add(product);
        }
    }

    private decimal PriceFor(Product product, int quantity, ProductVariant? variant = null)
    {
        var minQty = (int)Math.Max(0, product.WholesaleMinQty);
        var isWholesale = SelectedCustomer?.IsWholesale == true ||
                          (minQty > 0 && quantity >= minQty);
        var basePrice = variant?.Price ?? product.SellingPrice;
        if (variant != null)
        {
            if (isWholesale && product.WholesaleDiscountPercent > 0)
                return Math.Round(basePrice * (1 - product.WholesaleDiscountPercent / 100m), 2);
            return basePrice;
        }
        if (!isWholesale) return product.SellingPrice;
        if (product.WholesalePrice > 0) return product.WholesalePrice;
        if (product.WholesaleDiscountPercent > 0)
            return Math.Round(product.SellingPrice * (1 - product.WholesaleDiscountPercent / 100m), 2);
        return product.SellingPrice;
    }

    [RelayCommand]
    private void AddProduct(Product? product)
    {
        if (product == null) return;
        if (product.HasVariants) AddProductWithVariant(product);
        else AddOrIncrement(product, null);
    }

    private void AddOrIncrement(Product product, ProductVariant? variant)
    {
        ErrorMessage = null;

        var existing = Cart.FirstOrDefault(c =>
            c.Product.Id == product.Id && c.Variant?.Id == variant?.Id);
        var wanted = (existing?.Quantity ?? 0) + 1;
        if (!ValidateStock(product, variant, wanted)) return;

        if (existing != null)
        {
            existing.Quantity++;
        }
        else
        {
            var item = new CartItem(product, variant)
            {
                Price = PriceFor(product, 1, variant)
            };
            item.PropertyChanged += OnCartItemChanged;
            Cart.Add(item);
        }
        RecalculateTotals();
    }

    private void AddProductWithVariant(Product product)
    {
        var available = product.Variants.Where(v => !v.IsOutOfStock).ToList();
        if (available.Count == 0)
        {
            ErrorMessage = $"Semua varian {product.Name} stoknya habis.";
            return;
        }

        var options = available
            .Select(v => new FormOption(v.Id, $"{v.DisplayName} • {Formatters.Rupiah(v.Price)} • stok {Formatters.Number(v.Stock)}"))
            .ToList();
        var values = FormDialog.Show(
            Application.Current.MainWindow,
            "Pilih Varian",
            product.Name,
            new[]
            {
                new FormField
                {
                    Key = "variantId",
                    Label = "Varian",
                    Required = true,
                    Value = options[0].Value,
                    Options = options
                }
            },
            "Tambah");
        if (values == null) return;
        var variant = available.FirstOrDefault(v => v.Id == values["variantId"]);
        if (variant == null) return;
        AddOrIncrement(product, variant);
    }

    private bool ValidateStock(Product product, ProductVariant? variant, int wanted)
    {
        var stock = variant?.Stock ?? product.Stock;
        if (wanted <= stock) return true;
        var label = variant == null ? product.Name : $"{product.Name} ({variant.DisplayName})";
        ErrorMessage = $"Stok {label} tidak mencukupi. Tersedia {Formatters.Number(stock)}, diminta {wanted}.";
        return false;
    }

    private void OnCartItemChanged(object? sender, PropertyChangedEventArgs e)
    {
        if (sender is CartItem item && e.PropertyName == nameof(CartItem.Quantity)
            && !item.PriceOverridden)
        {
            var price = PriceFor(item.Product, item.Quantity, item.Variant);
            if (item.Price != price) item.Price = price;
        }
        if (e.PropertyName is nameof(CartItem.Quantity) or nameof(CartItem.Price))
            RecalculateTotals();
    }

    [RelayCommand]
    private void EditPrice(CartItem? item)
    {
        if (item == null || !CanEditPrice) return;
        var values = FormDialog.Show(
            Application.Current.MainWindow,
            "Ubah Harga",
            $"{item.Name} • harga normal {Formatters.Rupiah(PriceFor(item.Product, item.Quantity, item.Variant))}",
            new[]
            {
                new FormField
                {
                    Key = "price",
                    Label = "Harga satuan",
                    Required = true,
                    Value = item.Price.ToString("0")
                }
            });
        if (values == null) return;
        var price = Formatters.ParseMoney(values["price"]);
        if (price < 0) return;
        item.Price = price;
        item.PriceOverridden = true;
        RecalculateTotals();
    }

    [RelayCommand]
    private void ResetPrice(CartItem? item)
    {
        if (item == null) return;
        item.PriceOverridden = false;
        item.Price = PriceFor(item.Product, item.Quantity, item.Variant);
        RecalculateTotals();
    }

    [RelayCommand]
    private void AddBySearch()
    {
        var key = SearchText.Trim();
        if (string.IsNullOrWhiteSpace(key)) return;
        foreach (var product in _allProducts)
        {
            var variant = product.Variants.FirstOrDefault(v =>
                string.Equals(v.Barcode, key, StringComparison.OrdinalIgnoreCase) ||
                string.Equals(v.Sku, key, StringComparison.OrdinalIgnoreCase) ||
                string.Equals(v.QrCode, key, StringComparison.OrdinalIgnoreCase));
            if (variant == null) continue;
            AddOrIncrement(product, variant);
            SearchText = "";
            return;
        }
        var matched = _allProducts.FirstOrDefault(p =>
            string.Equals(p.Barcode, key, StringComparison.OrdinalIgnoreCase) ||
            string.Equals(p.Sku, key, StringComparison.OrdinalIgnoreCase)) ??
                      FilteredProducts.FirstOrDefault();
        if (matched == null)
        {
            ErrorMessage = $"Produk \"{key}\" tidak ditemukan.";
            return;
        }
        AddProduct(matched);
        SearchText = "";
    }

    [RelayCommand]
    private void Increase(CartItem? item)
    {
        if (item == null) return;
        ErrorMessage = null;
        if (!ValidateStock(item.Product, item.Variant, item.Quantity + 1)) return;
        item.Quantity++;
    }

    [RelayCommand]
    private void Decrease(CartItem? item)
    {
        if (item == null) return;
        if (item.Quantity <= 1) RemoveItem(item);
        else item.Quantity--;
    }

    [RelayCommand]
    private void RemoveItem(CartItem? item)
    {
        if (item == null) return;
        item.PropertyChanged -= OnCartItemChanged;
        Cart.Remove(item);
        RecalculateTotals();
    }

    [RelayCommand]
    private void ClearCart()
    {
        if (Cart.Count == 0) return;
        if (!Confirm("Kosongkan semua item di keranjang?", "Kosongkan Keranjang")) return;
        foreach (var item in Cart) item.PropertyChanged -= OnCartItemChanged;
        Cart.Clear();
        DiscountText = "0";
        PaidText = "";
        RecalculateTotals();
    }

    [RelayCommand]
    private void PayExact() => PaidText = Total.ToString("0");

    private decimal ParseDiscount()
    {
        var value = Formatters.ParseMoney(DiscountText);
        return Math.Clamp(value, 0, Subtotal);
    }

    private decimal ParseTaxRate()
    {
        var value = Formatters.ParseMoney(TaxRateText);
        return Math.Clamp(value, 0, 100);
    }

    private void RecalculateTotals()
    {
        Subtotal = Cart.Sum(c => c.Price * c.Quantity);
        var discount = ParseDiscount();
        Tax = Math.Max(0, Math.Round((Subtotal - discount) * (ParseTaxRate() / 100m), 2));
        Total = Math.Max(0, Subtotal - discount + Tax);
        ChangeAmount = Formatters.ParseMoney(PaidText) - Total;
        OnPropertyChanged(nameof(DiscountLabel));
        OnPropertyChanged(nameof(CartCountText));
    }

    [RelayCommand]
    private async Task CheckoutAsync()
    {
        ErrorMessage = null;
        StatusMessage = null;

        if (Cart.Count == 0)
        {
            ErrorMessage = "Keranjang masih kosong.";
            return;
        }

        if (Total <= 0)
        {
            ErrorMessage = "Total transaksi harus lebih dari nol.";
            return;
        }

        var method = SelectedPayment switch
        {
            "Kartu" => "CARD",
            "QRIS" => "QRIS",
            "Transfer" => "TRANSFER",
            "E-Wallet" => "EWALLET",
            "Kredit" => "CREDIT",
            _ => "CASH"
        };

        var hasCustomer = SelectedCustomer != null && !string.IsNullOrWhiteSpace(SelectedCustomer.Id);
        if (IsCreditPayment && !hasCustomer)
        {
            ErrorMessage = "Pilih pelanggan terlebih dahulu untuk transaksi kredit.";
            return;
        }

        var paid = method == "CASH" ? Formatters.ParseMoney(PaidText) : Total;
        if (method == "CREDIT") paid = 0;
        if (method == "CASH" && paid < Total)
        {
            ErrorMessage = $"Jumlah bayar kurang {Formatters.Rupiah(Total - paid)}.";
            return;
        }

        if (_openShift == null)
        {
            try
            {
                _openShift = (await _services.Api.GetShiftsAsync("OPEN", _services.User.Id, 5)).FirstOrDefault();
            }
            catch
            {
                // Shift opsional; transaksi tetap dapat disimpan tanpa shift.
            }
        }

        if (_openShift == null &&
            !Confirm("Belum ada shift kasir yang terbuka. Transaksi tetap disimpan tanpa shift?", "Shift Belum Dibuka"))
        {
            return;
        }

        var invoiceNo = $"INV-{DateTime.Now:yyyyMMddHHmmss}{Random.Shared.Next(100, 999)}";
        var saleId = Guid.NewGuid().ToString();
        var items = Cart.Select(c => new SaleItem
        {
            Id = Guid.NewGuid().ToString(),
            SaleId = saleId,
            ProductId = c.Product.Id,
            VariantId = c.Variant?.Id,
            VariantName = c.Variant?.DisplayName,
            Name = c.Name,
            Sku = c.Sku,
            Price = c.Price,
            Qty = c.Quantity,
            LineTotal = c.Price * c.Quantity,
            PriceOverridden = c.PriceOverridden
        }).ToList();

        var sale = new Sale
        {
            Id = saleId,
            InvoiceNo = invoiceNo,
            CashierId = _services.User.Id,
            CustomerId = hasCustomer ? SelectedCustomer!.Id : null,
            CustomerName = hasCustomer ? SelectedCustomer!.Name : null,
            ShiftId = _openShift?.Id,
            Status = method == "CREDIT" ? "CREDIT" : "PAID",
            Subtotal = Subtotal,
            Discount = ParseDiscount(),
            Tax = Tax,
            Total = Total,
            PaidAmount = paid,
            ChangeAmount = method == "CASH" ? Math.Max(0, paid - Total) : 0,
            PaymentMethod = method.ToLowerInvariant(),
            Notes = string.IsNullOrWhiteSpace(Note) ? null : Note.Trim(),
            DueDate = method == "CREDIT" ? DueDate?.Date : null,
            CreatedAt = DateTime.Now,
            UpdatedAt = DateTime.Now,
            Items = items
        };

        var payload = new
        {
            id = saleId,
            invoiceNo,
            cashierId = _services.User.Id,
            shiftId = _openShift?.Id,
            customerId = string.IsNullOrWhiteSpace(SelectedCustomer?.Id) ? null : SelectedCustomer!.Id,
            status = sale.Status,
            subtotal = Subtotal,
            discount = sale.Discount,
            tax = sale.Tax,
            total = Total,
            notes = sale.Notes,
            paidAmount = paid,
            changeAmount = sale.ChangeAmount,
            paymentMethod = method,
            dueDate = method == "CREDIT" ? DueDate?.ToString("yyyy-MM-dd") : null,
            paymentReference = (string?)null,
            items = items.Select(i => new
            {
                productId = i.ProductId,
                variantId = i.VariantId,
                variantName = i.VariantName,
                name = i.Name,
                sku = i.Sku,
                price = i.Price,
                qty = i.Qty,
                lineTotal = i.LineTotal,
                priceOverride = i.PriceOverridden
            })
        };

        await RunAsync(async () =>
        {
            await _services.Api.CreateSaleAsync(payload, default);
            LastInvoice = invoiceNo;

            var receipt = new ReceiptWindow(sale, _services.TenantName, _services.Store.Settings);
            receipt.Owner = System.Windows.Application.Current.MainWindow;
            receipt.ShowDialog();

            foreach (var item in Cart) item.PropertyChanged -= OnCartItemChanged;
            Cart.Clear();
            DiscountText = "0";
            PaidText = "";
            Note = "";
            SelectedCustomer = Customers.FirstOrDefault(c => string.IsNullOrEmpty(c.Id));
            RecalculateTotals();
            StatusMessage = _services.IsOnline
                ? $"Transaksi {invoiceNo} berhasil disimpan."
                : $"Transaksi {invoiceNo} disimpan offline dan akan dikirim otomatis saat online.";
            _services.NotifySyncStatus();

            var refreshed = await _services.Api.GetAllProductsAsync();
            _allProducts.Clear();
            _allProducts.AddRange(refreshed);
            ApplyFilter();
        });
    }
}


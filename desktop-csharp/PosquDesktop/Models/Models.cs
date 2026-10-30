using PosquDesktop.Services;

namespace PosquDesktop.Models;

public sealed class UserInfo
{
    public string Id { get; set; } = "";
    public string Email { get; set; } = "";
    public string Name { get; set; } = "";
    public string Role { get; set; } = "USER";
    public string? TenantId { get; set; }
    public string? TenantName { get; set; }
    public string? Image { get; set; }

    public string DisplayRole => string.IsNullOrWhiteSpace(Role) ? "USER" : Role.Replace('_', ' ');
}

public sealed class StoredSession
{
    public string Token { get; set; } = "";
    public UserInfo User { get; set; } = new();
    public DateTime SavedAt { get; set; } = DateTime.Now;
}

public sealed class TenantInfo
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public string? Slug { get; set; }
    public string? Status { get; set; }
}

public sealed class PlanInfo
{
    public string Slug { get; set; } = "starter";
    public string Name { get; set; } = "Starter";
}

public sealed class TenantResponse
{
    public TenantInfo? Tenant { get; set; }
    public PlanInfo? Plan { get; set; }
    public PackageInfo? Package { get; set; }
}

public sealed class PackageInfo
{
    public string Slug { get; set; } = "starter";
    public bool IsFree { get; set; }
    public bool CanUseDatabase { get; set; }
    public bool CanSync { get; set; }
}

public sealed class Product
{
    public string Id { get; set; } = "";
    public string Sku { get; set; } = "";
    public string? Barcode { get; set; }
    public string Name { get; set; } = "";
    public string? Description { get; set; }
    public string? CategoryId { get; set; }
    public string? CategoryName { get; set; }
    public string? UnitId { get; set; }
    public string? Unit { get; set; }
    public string? BrandId { get; set; }
    public string? BrandName { get; set; }
    public string? SupplierId { get; set; }
    public string? SupplierName { get; set; }
    public string? QrCode { get; set; }
    public string? ImageUrl { get; set; }
    public decimal CostPrice { get; set; }
    public decimal SellingPrice { get; set; }
    public decimal MarginPct { get; set; }
    public decimal WholesalePrice { get; set; }
    public decimal WholesaleDiscountPercent { get; set; }
    public decimal WholesaleMinQty { get; set; }
    public decimal TaxRate { get; set; }
    public decimal MinStock { get; set; }
    public decimal ReorderPoint { get; set; }
    public decimal Weight { get; set; }
    public decimal Volume { get; set; }
    public decimal Stock { get; set; }
    public bool IsActive { get; set; } = true;
    public bool IsFeatured { get; set; }
    public bool IsConsignment { get; set; }
    public string Type { get; set; } = "SINGLE";
    public List<ProductVariant> Variants { get; set; } = new();
    public DateTime? CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    public string StatusLabel => IsActive ? "Aktif" : "Nonaktif";
    public bool HasVariants => Variants.Count > 0;
    public string VariantCountText => HasVariants ? $"{Variants.Count} varian" : "";
    public decimal DisplayStock => HasVariants ? Variants.Sum(v => v.Stock) : Stock;
}

public sealed class ProductVariant
{
    public string Id { get; set; } = "";
    public string? ProductId { get; set; }
    public string Sku { get; set; } = "";
    public string Name { get; set; } = "";
    public string? Barcode { get; set; }
    public string? QrCode { get; set; }
    public decimal Price { get; set; }
    public decimal Stock { get; set; }
    public bool IsActive { get; set; } = true;

    public bool IsOutOfStock => Stock <= 0;
    public string DisplayName => string.IsNullOrWhiteSpace(Name) ? Sku : Name;
    public string PriceText => Formatters.Rupiah(Price);
}


public sealed class ProductCategory
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;
    public int ProductCount { get; set; }
}

public sealed class ProductUnit
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
}

public sealed class ProductBrand
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public DateTime? CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public sealed class Customer
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public decimal TotalPurchase { get; set; }
    public int PurchaseCount { get; set; }
    public decimal Points { get; set; }
    public bool IsWholesale { get; set; }
    public string CustomerType { get; set; } = "RETAIL";
    public bool IsActive { get; set; } = true;
}

public sealed class Supplier
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? ContactPerson { get; set; }
    public string? Npwp { get; set; }
    public bool IsActive { get; set; } = true;
}

public sealed class PurchaseOrder
{
    public string Id { get; set; } = "";
    public string OrderNo { get; set; } = "";
    public string? SupplierId { get; set; }
    public string? SupplierName { get; set; }
    public string Status { get; set; } = "DRAFT";
    public string? Notes { get; set; }
    public decimal Subtotal { get; set; }
    public decimal Tax { get; set; }
    public decimal Total { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public List<PurchaseOrderItem> Items { get; set; } = new();

    public int ItemCount => Items.Count;
    public string StatusLabel => Status.ToUpperInvariant() switch
    {
        "ORDERED" => "Dipesan",
        "RECEIVED" => "Diterima",
        "CANCELED" => "Dibatalkan",
        _ => "Draft"
    };
    public string TotalText => Formatters.Rupiah(Total);
}

public sealed class PurchaseOrderItem
{
    public string Id { get; set; } = "";
    public string PurchaseOrderId { get; set; } = "";
    public string ProductId { get; set; } = "";
    public string Name { get; set; } = "";
    public string Sku { get; set; } = "";
    public decimal CostPrice { get; set; }
    public decimal Qty { get; set; }
    public decimal LineTotal { get; set; }
}
public sealed class Sale
{
    public string Id { get; set; } = "";
    public string InvoiceNo { get; set; } = "";
    public string? CashierId { get; set; }
    public string? CustomerId { get; set; }
    public string? CustomerName { get; set; }
    public string? ShiftId { get; set; }
    public string Status { get; set; } = "PAID";
    public decimal Subtotal { get; set; }
    public decimal Discount { get; set; }
    public decimal Tax { get; set; }
    public decimal Total { get; set; }
    public decimal PaidAmount { get; set; }
    public decimal ChangeAmount { get; set; }
    public string PaymentMethod { get; set; } = "cash";
    public string? PaymentReference { get; set; }
    public string? Notes { get; set; }
    public DateTime? DueDate { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public List<SaleItem> Items { get; set; } = new();

    public string PaymentLabel => PaymentMethod.ToUpperInvariant() switch
    {
        "CASH" => "Tunai",
        "QRIS" => "QRIS",
        "TRANSFER" => "Transfer",
        "EWALLET" => "E-Wallet",
        "CARD" => "Kartu",
        "CREDIT" => "Kredit",
        _ => PaymentMethod
    };
}

public sealed class SaleItem
{
    public string Id { get; set; } = "";
    public string SaleId { get; set; } = "";
    public string ProductId { get; set; } = "";
    public string? VariantId { get; set; }
    public string? VariantName { get; set; }
    public string Name { get; set; } = "";
    public string Sku { get; set; } = "";
    public decimal Price { get; set; }
    public decimal Qty { get; set; }
    public decimal LineTotal { get; set; }
    public bool PriceOverridden { get; set; }
}

public sealed class CashierShift
{
    public string Id { get; set; } = "";
    public string? BranchId { get; set; }
    public string? CashierId { get; set; }
    public DateTime OpenedAt { get; set; }
    public DateTime? ClosedAt { get; set; }
    public string Status { get; set; } = "OPEN";
    public decimal OpeningCash { get; set; }
    public decimal CashSystem { get; set; }
    public decimal? CashCounted { get; set; }
    public decimal CashDifference { get; set; }
    public decimal TotalSales { get; set; }
    public decimal TotalCash { get; set; }
    public decimal TotalQris { get; set; }
    public decimal TotalTransfer { get; set; }
    public decimal TotalEwallet { get; set; }
    public int TransactionCount { get; set; }
    public string? OpenNote { get; set; }
    public string? CloseNote { get; set; }

    public string StatusLabel => Status == "OPEN" ? "Buka" : "Tutup";
    public bool IsOpen => Status == "OPEN";
    public string OpenedLabel => OpenedAt.ToString("dd/MM/yyyy HH:mm");
    public string ClosedLabel => ClosedAt?.ToString("dd/MM/yyyy HH:mm") ?? "-";
}

public sealed class CashTransaction
{
    public string Id { get; set; } = "";
    public string? ShiftId { get; set; }
    public string UserId { get; set; } = "";
    public string Type { get; set; } = "IN";
    public string Category { get; set; } = "";
    public decimal Amount { get; set; }
    public string? Description { get; set; }
    public DateTime TransactionDate { get; set; }
    public DateTime CreatedAt { get; set; }

    public string TypeLabel => Type.Equals("OUT", StringComparison.OrdinalIgnoreCase) ? "Keluar" : "Masuk";
}

public sealed class Receivable
{
    public string Id { get; set; } = "";
    public string? CustomerId { get; set; }
    public string? CustomerName { get; set; }
    public string InvoiceNo { get; set; } = "";
    public string? Description { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal PaidAmount { get; set; }
    public decimal RemainingAmount { get; set; }
    public DateTime? DueDate { get; set; }
    public string Status { get; set; } = "UNPAID";
    public DateTime CreatedAt { get; set; }

    public string DueDateLabel => DueDate?.ToString("dd/MM/yyyy") ?? "-";
    public string StatusLabel => Status.ToUpperInvariant() switch
    {
        "PAID" => "Lunas",
        "PARTIAL" => "Sebagian",
        "OVERDUE" => "Jatuh Tempo",
        _ => "Belum Bayar"
    };
}

public sealed class Payable
{
    public string Id { get; set; } = "";
    public string? SupplierId { get; set; }
    public string? SupplierName { get; set; }
    public string InvoiceNo { get; set; } = "";
    public string? Description { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal PaidAmount { get; set; }
    public decimal RemainingAmount { get; set; }
    public DateTime? DueDate { get; set; }
    public string Status { get; set; } = "UNPAID";
    public DateTime CreatedAt { get; set; }

    public string DueDateLabel => DueDate?.ToString("dd/MM/yyyy") ?? "-";
    public string StatusLabel => Status.ToUpperInvariant() switch
    {
        "PAID" => "Lunas",
        "PARTIAL" => "Sebagian",
        "OVERDUE" => "Jatuh Tempo",
        _ => "Belum Bayar"
    };
}


using System.Collections.ObjectModel;
using System.Windows;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using PosquDesktop.Services;

namespace PosquDesktop.ViewModels;

public partial class NavItem : ObservableObject
{
    public required string Key { get; init; }
    public required string Label { get; init; }
    public required string Icon { get; init; }
    public required string Title { get; init; }
    public required string Subtitle { get; init; }
    public bool IsAllowed { get; init; } = true;

    [ObservableProperty] private bool isSelected;
}

public sealed class NavGroup
{
    public required string Label { get; init; }
    public required IReadOnlyList<NavItem> Items { get; init; }
}

public partial class MainViewModel : ObservableObject
{
    private readonly AppServices _services;
    private readonly Dictionary<string, NavItem> _navByKey = new();
    private readonly Dictionary<string, object> _pages = new();

    [ObservableProperty] private object? currentPage;
    [ObservableProperty] private string currentTitle = "Dashboard";
    [ObservableProperty] private string currentSubtitle = "";

    public ObservableCollection<NavGroup> NavGroups { get; } = new();

    public string UserName => _services.User.Name;
    public string UserRole => _services.User.DisplayRole;
    public string UserInitials
    {
        get
        {
            var name = _services.User.Name?.Trim();
            if (string.IsNullOrWhiteSpace(name)) return "U";
            var parts = name.Split(' ', StringSplitOptions.RemoveEmptyEntries);
            return parts.Length == 1
                ? parts[0][..1].ToUpperInvariant()
                : (parts[0][..1] + parts[^1][..1]).ToUpperInvariant();
        }
    }
    public string TenantName => _services.TenantName;
    public string PlanLabel => _services.PlanLabel;
    public string TodayLabel => DateTime.Now.ToString("dddd, dd MMMM yyyy");
    public string AppVersion => "1.0.0";

    public bool IsOnline => _services.IsOnline;
    public string ConnectionLabel => IsOnline ? "Online" : "Mode Offline";
    public string ConnectionHint => IsOnline
        ? "Terhubung ke server"
        : "Transaksi disimpan lokal dan dikirim otomatis saat online";
    public int PendingSyncCount => _services.PendingSyncCount;
    public bool HasPendingSync => PendingSyncCount > 0;
    public bool IsSyncing => _services.IsSyncing;
    public string SyncLabel => IsSyncing
        ? "Menyinkronkan..."
        : PendingSyncCount > 0
            ? $"{PendingSyncCount} data menunggu"
            : LastSyncLabel;
    public string LastSyncLabel => _services.LastSyncAt is { } last
        ? "Sinkron " + last.ToString("HH:mm")
        : "Belum pernah sinkron";
    public string SyncError => _services.SyncError ?? "";
    public bool ShowOfflineBanner => !IsOnline || HasPendingSync;

    public event Action? LogoutRequested;

    public MainViewModel(AppServices services)
    {
        _services = services;
        _services.StateChanged += OnServicesChanged;
        BuildNav();
    }

    private void OnServicesChanged()
    {
        OnPropertyChanged(nameof(IsOnline));
        OnPropertyChanged(nameof(ConnectionLabel));
        OnPropertyChanged(nameof(ConnectionHint));
        OnPropertyChanged(nameof(PendingSyncCount));
        OnPropertyChanged(nameof(HasPendingSync));
        OnPropertyChanged(nameof(IsSyncing));
        OnPropertyChanged(nameof(SyncLabel));
        OnPropertyChanged(nameof(LastSyncLabel));
        OnPropertyChanged(nameof(SyncError));
        OnPropertyChanged(nameof(ShowOfflineBanner));
        OnPropertyChanged(nameof(TenantName));
        OnPropertyChanged(nameof(PlanLabel));
    }

    [RelayCommand]
    private async Task SyncNowAsync()
    {
        await _services.SyncNowAsync();
    }

    private void BuildNav()
    {
        var role = _services.User.Role.ToUpperInvariant();

        bool Allow(params string[] roles) =>
            string.IsNullOrWhiteSpace(role) || roles.Contains(role);

        var groups = new List<NavGroup>
        {
            new()
            {
                Label = "Operasional",
                Items = new[]
                {
                    Item("dashboard", "Dashboard", "\uE80F", "Dashboard", "Ringkasan performa toko hari ini.", true),
                    Item("pos", "Kasir / POS", "\uE7BF", "Kasir", "Buat transaksi penjualan baru.", Allow("OWNER", "ADMIN", "CASHIER", "CASHIER_STAFF", "BRANCH_MANAGER")),
                    Item("sales", "Riwayat Penjualan", "\uE8A5", "Riwayat Penjualan", "Semua transaksi yang tercatat.", Allow("OWNER", "ADMIN", "CASHIER", "CASHIER_STAFF", "ACCOUNTANT", "BRANCH_MANAGER")),
                    Item("shifts", "Shift Kasir", "\uE823", "Shift Kasir", "Buka dan tutup shift kasir.", Allow("OWNER", "ADMIN", "CASHIER", "CASHIER_STAFF", "BRANCH_MANAGER")),
                    Item("cash", "Kas", "\uE8C7", "Kas Masuk & Keluar", "Catat transaksi kas operasional.", Allow("OWNER", "ADMIN", "ACCOUNTANT", "BRANCH_MANAGER"))
                }
            },
            new()
            {
                Label = "Persediaan",
                Items = new[]
                {
                    Item("products", "Produk", "\uE7B8", "Produk", "Kelola katalog, harga, dan stok.", true),
                    Item("categories", "Kategori & Satuan", "\uE8EC", "Kategori & Satuan", "Kelompokkan produk dan satuan jual.", true),
                    Item("purchases", "Pembelian", "\uE7BF", "Pembelian", "Pembelian stok dari supplier.", Allow("OWNER", "ADMIN", "WAREHOUSE", "BRANCH_MANAGER")),
                    Item("returns", "Retur", "\uE7A7", "Retur", "Retur penjualan dan pembelian.", Allow("OWNER", "ADMIN", "CASHIER", "CASHIER_STAFF", "BRANCH_MANAGER")),
                    Item("customers", "Pelanggan", "\uE716", "Pelanggan", "Data pelanggan dan member.", true),
                    Item("suppliers", "Supplier", "\uE8D4", "Supplier", "Data pemasok barang.", true)
                }
            },
            new()
            {
                Label = "Keuangan",
                Items = new[]
                {
                    Item("receivables", "Piutang", "\uE8C8", "Piutang", "Tagihan pelanggan yang belum lunas.", Allow("OWNER", "ADMIN", "ACCOUNTANT", "BRANCH_MANAGER")),
                    Item("payables", "Utang", "\uE8C6", "Utang", "Kewajiban ke supplier.", Allow("OWNER", "ADMIN", "ACCOUNTANT", "BRANCH_MANAGER")),
                    Item("reports", "Laporan", "\uE9D2", "Laporan", "Analisis penjualan dan produk terlaris.", Allow("OWNER", "ADMIN", "ACCOUNTANT", "BRANCH_MANAGER"))
                }
            },
            new()
            {
                Label = "Sistem",
                Items = new[]
                {
                    Item("sync", "Sinkronisasi", "\uE895", "Sinkronisasi", "Muat ulang data terbaru dari server.", true),
                    Item("settings", "Pengaturan", "\uE713", "Pengaturan", "Server, printer, dan akun.", Allow("OWNER", "ADMIN", "SUPER_ADMIN"))
                }
            }
        };

        foreach (var group in groups)
        {
            var visible = group.Items.Where(i => i.IsAllowed).ToList();
            if (visible.Count == 0) continue;
            foreach (var item in visible) _navByKey[item.Key] = item;
            NavGroups.Add(new NavGroup { Label = group.Label, Items = visible });
        }

        NavItem Item(string key, string label, string icon, string title, string subtitle, bool allowed) =>
            new NavItem { Key = key, Label = label, Icon = icon, Title = title, Subtitle = subtitle, IsAllowed = allowed };
    }

    public void Start()
    {
        Navigate("dashboard");
    }

    [RelayCommand]
    private void Navigate(string? key)
    {
        if (string.IsNullOrWhiteSpace(key) || !_navByKey.TryGetValue(key, out var nav))
            return;

        foreach (var item in _navByKey.Values) item.IsSelected = item.Key == key;
        CurrentTitle = nav.Title;
        CurrentSubtitle = nav.Subtitle;

        if (!_pages.TryGetValue(key, out var page))
        {
            page = CreatePage(key);
            _pages[key] = page;
        }

        CurrentPage = page;
        if (page is IRefreshable refreshable)
            _ = refreshable.RefreshAsync();
    }

    private object CreatePage(string key) => key switch
    {
        "dashboard" => new DashboardViewModel(_services, Navigate),
        "pos" => new PosViewModel(_services),
        "sales" => new SalesViewModel(_services),
        "shifts" => new ShiftsViewModel(_services),
        "products" => new ProductsViewModel(_services),
        "categories" => new CategoriesViewModel(_services),
        "customers" => new CustomersViewModel(_services),
        "suppliers" => new SuppliersViewModel(_services),
        "cash" => new CashViewModel(_services),
        "reports" => new ReportsViewModel(_services),
        "settings" => new SettingsViewModel(_services),
        "sync" => new SyncViewModel(_services),
        "receivables" => new LedgerViewModel(_services, true),
        "payables" => new LedgerViewModel(_services, false),
        "purchases" => new PurchasesViewModel(_services),
        "returns" => new ComingSoonViewModel("Retur", "Modul retur belum tersedia di server maupun aplikasi web/Android. Fitur ini akan aktif setelah model retur tersedia di backend."),
        _ => new ComingSoonViewModel("Segera Hadir", "Halaman ini belum tersedia.")
    };

    [RelayCommand]
    private async Task RefreshAsync()
    {
        if (CurrentPage is IRefreshable refreshable)
            await refreshable.RefreshAsync();
        OnPropertyChanged(nameof(TenantName));
        OnPropertyChanged(nameof(PlanLabel));
        OnPropertyChanged(nameof(UserName));
        OnPropertyChanged(nameof(UserRole));
    }

    [RelayCommand]
    private void Logout()
    {
        if (MessageBox.Show("Keluar dari aplikasi sekarang?", "Logout", MessageBoxButton.YesNo,
                MessageBoxImage.Question) != MessageBoxResult.Yes) return;
        _services.SignOut();
        LogoutRequested?.Invoke();
    }
}



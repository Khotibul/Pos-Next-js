using System.Collections.ObjectModel;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using PosquDesktop.Models;
using PosquDesktop.Services;
using PosquDesktop.Views.Dialogs;

namespace PosquDesktop.ViewModels;

public partial class CustomersViewModel : ViewModelBase
{
    private readonly AppServices _services;
    private List<Customer> _all = new();

    [ObservableProperty] private string searchText = "";
    [ObservableProperty] private Customer? selectedCustomer;
    [ObservableProperty] private int totalCount;
    [ObservableProperty] private int wholesaleCount;

    public ObservableCollection<Customer> Customers { get; } = new();
    public bool IsEmpty => Customers.Count == 0;

    partial void OnSearchTextChanged(string value) => ApplyFilter();

    public CustomersViewModel(AppServices services)
    {
        _services = services;
    }

    public override Task LoadAsync() => RunAsync(RefreshDataAsync);

    private async Task RefreshDataAsync()
    {
        _all = await _services.Api.GetCustomersAsync();
        TotalCount = _all.Count;
        WholesaleCount = _all.Count(c => c.IsWholesale);
        ApplyFilter();
    }

    private void ApplyFilter()
    {
        var search = SearchText.Trim().ToLowerInvariant();
        Customers.Clear();
        foreach (var customer in _all
                     .Where(c => search.Length == 0 ||
                                 c.Name.ToLowerInvariant().Contains(search) ||
                                 (c.Phone ?? "").Contains(search) ||
                                 (c.Email ?? "").ToLowerInvariant().Contains(search))
                     .OrderBy(c => c.Name))
        {
            Customers.Add(customer);
        }
        OnPropertyChanged(nameof(IsEmpty));
    }

    [RelayCommand]
    private async Task AddAsync()
    {
        var values = ShowEditor(null);
        if (values == null) return;
        var customer = BuildCustomer(values, new Customer { Id = Guid.NewGuid().ToString() });
        await RunAsync(async () =>
        {
            await _services.Api.SaveCustomerAsync(customer);
            StatusMessage = "Pelanggan baru berhasil disimpan.";
            await RefreshDataAsync();
        });
    }

    [RelayCommand]
    private async Task EditAsync(Customer? customer)
    {
        customer ??= SelectedCustomer;
        if (customer == null) return;
        var values = ShowEditor(customer);
        if (values == null) return;
        var updated = BuildCustomer(values, customer);
        await RunAsync(async () =>
        {
            await _services.Api.SaveCustomerAsync(updated);
            StatusMessage = $"Pelanggan “{updated.Name}” diperbarui.";
            await RefreshDataAsync();
        });
    }

    private Dictionary<string, string>? ShowEditor(Customer? customer)
    {
        var fields = new List<FormField>
        {
            new() { Key = "name", Label = "Nama pelanggan", Required = true, Value = customer?.Name },
            new() { Key = "phone", Label = "No. telepon / WhatsApp", Value = customer?.Phone },
            new() { Key = "email", Label = "Email", Value = customer?.Email },
            new() { Key = "city", Label = "Kota", Value = customer?.City },
            new() { Key = "address", Label = "Alamat", Multiline = true, Value = customer?.Address },
            new()
            {
                Key = "type",
                Label = "Tipe pelanggan",
                Options = new List<FormOption> { new("RETAIL", "Retail"), new("WHOLESALE", "Grosir / Member") },
                Value = customer?.CustomerType == "WHOLESALE" || customer?.IsWholesale == true ? "WHOLESALE" : "RETAIL"
            },
            new()
            {
                Key = "active",
                Label = "Status",
                Options = new List<FormOption> { new("1", "Aktif"), new("0", "Nonaktif") },
                Value = customer == null || customer.IsActive ? "1" : "0"
            }
        };

        return FormDialog.Show(
            System.Windows.Application.Current.MainWindow,
            customer == null ? "Tambah Pelanggan" : "Ubah Pelanggan",
            customer?.Name,
            fields,
            customer == null ? "Tambah Pelanggan" : "Simpan Perubahan");
    }

    private static Customer BuildCustomer(Dictionary<string, string> values, Customer customer)
    {
        customer.Name = values["name"].Trim();
        customer.Phone = string.IsNullOrWhiteSpace(values["phone"]) ? null : values["phone"].Trim();
        customer.Email = string.IsNullOrWhiteSpace(values["email"]) ? null : values["email"].Trim();
        customer.City = string.IsNullOrWhiteSpace(values["city"]) ? null : values["city"].Trim();
        customer.Address = string.IsNullOrWhiteSpace(values["address"]) ? null : values["address"].Trim();
        customer.CustomerType = values["type"];
        customer.IsWholesale = values["type"] == "WHOLESALE";
        customer.IsActive = values["active"] != "0";
        return customer;
    }
    [RelayCommand]
    private async Task DeleteAsync(Customer? customer)
    {
        customer ??= SelectedCustomer;
        if (customer == null) return;
        if (!Confirm($"Hapus pelanggan \"{customer.Name}\"? Pelanggan yang sudah memiliki transaksi tidak dapat dihapus.",
                "Hapus Pelanggan"))
            return;

        await RunAsync(async () =>
        {
            await _services.Api.DeleteCustomerAsync(customer.Id);
            StatusMessage = "Pelanggan dihapus.";
            await RefreshDataAsync();
        });
    }
}
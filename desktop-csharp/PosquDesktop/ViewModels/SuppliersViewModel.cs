using System.Collections.ObjectModel;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using PosquDesktop.Models;
using PosquDesktop.Services;
using PosquDesktop.Views.Dialogs;

namespace PosquDesktop.ViewModels;

public partial class SuppliersViewModel : ViewModelBase
{
    private readonly AppServices _services;
    private List<Supplier> _all = new();

    [ObservableProperty] private string searchText = "";
    [ObservableProperty] private Supplier? selectedSupplier;
    [ObservableProperty] private int totalCount;
    [ObservableProperty] private int activeCount;

    public ObservableCollection<Supplier> Suppliers { get; } = new();
    public bool IsEmpty => Suppliers.Count == 0;

    partial void OnSearchTextChanged(string value) => ApplyFilter();

    public SuppliersViewModel(AppServices services)
    {
        _services = services;
    }

    public override Task LoadAsync() => RunAsync(RefreshDataAsync);

    private async Task RefreshDataAsync()
    {
        _all = await _services.Api.GetSuppliersAsync();
        TotalCount = _all.Count;
        ActiveCount = _all.Count(s => s.IsActive);
        ApplyFilter();
    }

    private void ApplyFilter()
    {
        var search = SearchText.Trim().ToLowerInvariant();
        Suppliers.Clear();
        foreach (var supplier in _all
                     .Where(s => search.Length == 0 ||
                                 s.Name.ToLowerInvariant().Contains(search) ||
                                 (s.Phone ?? "").Contains(search) ||
                                 (s.ContactPerson ?? "").ToLowerInvariant().Contains(search))
                     .OrderBy(s => s.Name))
        {
            Suppliers.Add(supplier);
        }
        OnPropertyChanged(nameof(IsEmpty));
    }

    [RelayCommand]
    private async Task AddAsync()
    {
        var values = ShowEditor(null);
        if (values == null) return;
        var supplier = BuildSupplier(values, new Supplier { Id = Guid.NewGuid().ToString() });
        await RunAsync(async () =>
        {
            await _services.Api.SaveSupplierAsync(supplier);
            StatusMessage = "Supplier baru berhasil disimpan.";
            await RefreshDataAsync();
        });
    }

    [RelayCommand]
    private async Task EditAsync(Supplier? supplier)
    {
        supplier ??= SelectedSupplier;
        if (supplier == null) return;
        var values = ShowEditor(supplier);
        if (values == null) return;
        var updated = BuildSupplier(values, supplier);
        await RunAsync(async () =>
        {
            await _services.Api.SaveSupplierAsync(updated);
            StatusMessage = $"Supplier “{updated.Name}” diperbarui.";
            await RefreshDataAsync();
        });
    }

    private Dictionary<string, string>? ShowEditor(Supplier? supplier)
    {
        var fields = new List<FormField>
        {
            new() { Key = "name", Label = "Nama supplier", Required = true, Value = supplier?.Name },
            new() { Key = "contact", Label = "Nama kontak", Value = supplier?.ContactPerson },
            new() { Key = "phone", Label = "No. telepon / WhatsApp", Value = supplier?.Phone },
            new() { Key = "email", Label = "Email", Value = supplier?.Email },
            new() { Key = "city", Label = "Kota", Value = supplier?.City },
            new() { Key = "npwp", Label = "NPWP", Value = supplier?.Npwp },
            new() { Key = "address", Label = "Alamat", Multiline = true, Value = supplier?.Address },
            new()
            {
                Key = "active",
                Label = "Status",
                Options = new List<FormOption> { new("1", "Aktif"), new("0", "Nonaktif") },
                Value = supplier == null || supplier.IsActive ? "1" : "0"
            }
        };

        return FormDialog.Show(
            System.Windows.Application.Current.MainWindow,
            supplier == null ? "Tambah Supplier" : "Ubah Supplier",
            supplier?.Name,
            fields,
            supplier == null ? "Tambah Supplier" : "Simpan Perubahan");
    }

    private static Supplier BuildSupplier(Dictionary<string, string> values, Supplier supplier)
    {
        supplier.Name = values["name"].Trim();
        supplier.ContactPerson = string.IsNullOrWhiteSpace(values["contact"]) ? null : values["contact"].Trim();
        supplier.Phone = string.IsNullOrWhiteSpace(values["phone"]) ? null : values["phone"].Trim();
        supplier.Email = string.IsNullOrWhiteSpace(values["email"]) ? null : values["email"].Trim();
        supplier.City = string.IsNullOrWhiteSpace(values["city"]) ? null : values["city"].Trim();
        supplier.Npwp = string.IsNullOrWhiteSpace(values["npwp"]) ? null : values["npwp"].Trim();
        supplier.Address = string.IsNullOrWhiteSpace(values["address"]) ? null : values["address"].Trim();
        supplier.IsActive = values["active"] != "0";
        return supplier;
    }

    [RelayCommand]
    private async Task DeleteAsync(Supplier? supplier)
    {
        supplier ??= SelectedSupplier;
        if (supplier == null) return;
        if (!Confirm($"Hapus supplier \"{supplier.Name}\"? Supplier yang masih dipakai produk atau pembelian tidak dapat dihapus.",
                "Hapus Supplier"))
            return;

        await RunAsync(async () =>
        {
            await _services.Api.DeleteSupplierAsync(supplier.Id);
            StatusMessage = "Supplier dihapus.";
            await RefreshDataAsync();
        });
    }
}

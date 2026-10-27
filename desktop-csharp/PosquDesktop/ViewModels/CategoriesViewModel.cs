using System.Collections.ObjectModel;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using PosquDesktop.Models;
using PosquDesktop.Services;
using PosquDesktop.Views.Dialogs;

namespace PosquDesktop.ViewModels;

public partial class CategoriesViewModel : ViewModelBase
{
    private readonly AppServices _services;

    [ObservableProperty] private ProductCategory? selectedCategory;
    [ObservableProperty] private ProductUnit? selectedUnit;

    public ObservableCollection<ProductCategory> Categories { get; } = new();
    public ObservableCollection<ProductUnit> Units { get; } = new();

    public CategoriesViewModel(AppServices services)
    {
        _services = services;
    }

    public override Task LoadAsync() => RunAsync(RefreshDataAsync);

    private async Task RefreshDataAsync()
    {
        var categoriesTask = _services.Api.GetCategoriesAsync();
        var unitsTask = _services.Api.GetUnitsAsync();
        await Task.WhenAll(categoriesTask, unitsTask);

        Categories.Clear();
        foreach (var category in (await categoriesTask).OrderBy(c => c.Name))
            Categories.Add(category);

        Units.Clear();
        foreach (var unit in (await unitsTask).OrderBy(u => u.Name))
            Units.Add(unit);
    }

    [RelayCommand]
    private async Task AddCategoryAsync()
    {
        var values = FormDialog.Show(
            System.Windows.Application.Current.MainWindow,
            "Tambah Kategori",
            "Kategori membantu mengelompokkan produk.",
            new List<FormField>
            {
                new() { Key = "name", Label = "Nama kategori", Required = true },
                new() { Key = "description", Label = "Deskripsi", Multiline = true }
            },
            "Tambah Kategori");
        if (values == null) return;

        await RunAsync(async () =>
        {
            await _services.Api.SaveCategoryAsync(new ProductCategory
            {
                Id = Guid.NewGuid().ToString(),
                Name = values["name"].Trim(),
                Description = string.IsNullOrWhiteSpace(values["description"]) ? null : values["description"].Trim(),
                IsActive = true
            });
            StatusMessage = "Kategori ditambahkan.";
            await RefreshDataAsync();
        });
    }

    [RelayCommand]
    private async Task EditCategoryAsync(ProductCategory? category)
    {
        category ??= SelectedCategory;
        if (category == null) return;

        var values = FormDialog.Show(
            System.Windows.Application.Current.MainWindow,
            "Ubah Kategori",
            category.Name,
            new List<FormField>
            {
                new() { Key = "name", Label = "Nama kategori", Required = true, Value = category.Name },
                new() { Key = "description", Label = "Deskripsi", Multiline = true, Value = category.Description }
            });
        if (values == null) return;

        await RunAsync(async () =>
        {
            await _services.Api.SaveCategoryAsync(new ProductCategory
            {
                Id = category.Id,
                Name = values["name"].Trim(),
                Description = string.IsNullOrWhiteSpace(values["description"]) ? null : values["description"].Trim(),
                IsActive = category.IsActive,
                ProductCount = category.ProductCount
            });
            StatusMessage = "Kategori diperbarui.";
            await RefreshDataAsync();
        });
    }

    [RelayCommand]
    private async Task DeleteCategoryAsync(ProductCategory? category)
    {
        category ??= SelectedCategory;
        if (category == null) return;
        if (!Confirm($"Hapus kategori \"{category.Name}\"? Kategori yang masih dipakai produk tidak dapat dihapus.",
                "Hapus Kategori"))
            return;

        await RunAsync(async () =>
        {
            await _services.Api.DeleteCategoryAsync(category.Id);
            StatusMessage = "Kategori dihapus.";
            await RefreshDataAsync();
        });
    }

    [RelayCommand]
    private async Task AddUnitAsync()
    {
        var values = FormDialog.Show(
            System.Windows.Application.Current.MainWindow,
            "Tambah Satuan",
            "Contoh: pcs, kg, liter, porsi.",
            new List<FormField> { new() { Key = "name", Label = "Nama satuan", Required = true } },
            "Tambah Satuan");
        if (values == null) return;

        await RunAsync(async () =>
        {
            await _services.Api.SaveUnitAsync(new ProductUnit
            {
                Id = Guid.NewGuid().ToString(),
                Name = values["name"].Trim()
            });
            StatusMessage = "Satuan ditambahkan.";
            await RefreshDataAsync();
        });
    }

    [RelayCommand]
    private async Task EditUnitAsync(ProductUnit? unit)
    {
        unit ??= SelectedUnit;
        if (unit == null) return;

        var values = FormDialog.Show(
            System.Windows.Application.Current.MainWindow,
            "Ubah Satuan",
            unit.Name,
            new List<FormField> { new() { Key = "name", Label = "Nama satuan", Required = true, Value = unit.Name } });
        if (values == null) return;

        await RunAsync(async () =>
        {
            await _services.Api.SaveUnitAsync(new ProductUnit { Id = unit.Id, Name = values["name"].Trim() });
            StatusMessage = "Satuan diperbarui.";
            await RefreshDataAsync();
        });
    }
}


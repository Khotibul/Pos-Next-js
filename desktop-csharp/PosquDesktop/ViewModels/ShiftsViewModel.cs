using System.Collections.ObjectModel;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using PosquDesktop.Models;
using PosquDesktop.Services;
using PosquDesktop.Views.Dialogs;

namespace PosquDesktop.ViewModels;

public partial class ShiftsViewModel : ViewModelBase
{
    private readonly AppServices _services;

    [ObservableProperty] private CashierShift? selectedShift;
    [ObservableProperty] private CashierShift? currentOpenShift;
    [ObservableProperty] private int openCount;
    [ObservableProperty] private int closedCount;

    public ObservableCollection<CashierShift> Shifts { get; } = new();
    public string CurrentShiftLabel => CurrentOpenShift == null
        ? "Tidak ada shift terbuka"
        : $"Shift terbuka sejak {CurrentOpenShift.OpenedAt:dd/MM HH:mm} · Kas awal {Formatters.Rupiah(CurrentOpenShift.OpeningCash)}";

    public bool HasOpenShift => CurrentOpenShift != null;
    public bool HasSelection => SelectedShift != null;

    partial void OnCurrentOpenShiftChanged(CashierShift? value)
    {
        OnPropertyChanged(nameof(CurrentShiftLabel));
        OnPropertyChanged(nameof(HasOpenShift));
    }

    partial void OnSelectedShiftChanged(CashierShift? value) => OnPropertyChanged(nameof(HasSelection));

    public ShiftsViewModel(AppServices services)
    {
        _services = services;
    }

    public override Task LoadAsync() => RunAsync(RefreshDataAsync);

    private async Task RefreshDataAsync()
    {
        var shifts = await _services.Api.GetShiftsAsync(null, null, 100);
        Shifts.Clear();
        foreach (var shift in shifts) Shifts.Add(shift);

        OpenCount = shifts.Count(s => s.Status == "OPEN");
        ClosedCount = shifts.Count(s => s.Status != "OPEN");
        CurrentOpenShift = shifts.FirstOrDefault(s =>
            s.Status == "OPEN" && s.CashierId == _services.User.Id);

        if (SelectedShift != null)
        {
            SelectedShift = Shifts.FirstOrDefault(s => s.Id == SelectedShift.Id);
        }
    }

    [RelayCommand]
    private async Task OpenShiftAsync()
    {
        if (CurrentOpenShift != null)
        {
            ErrorMessage = "Masih ada shift terbuka. Tutup shift tersebut sebelum membuka shift baru.";
            return;
        }

        var values = FormDialog.Show(
            System.Windows.Application.Current.MainWindow,
            "Buka Shift Kasir",
            "Masukkan jumlah uang kas awal di laci kasir.",
            new List<FormField>
            {
                new() { Key = "openingCash", Label = "Kas awal (Rp)", Value = "0" },
                new() { Key = "note", Label = "Catatan", Multiline = true }
            },
            "Buka Shift");
        if (values == null) return;

        await RunAsync(async () =>
        {
            await _services.Api.OpenShiftAsync(new
            {
                id = Guid.NewGuid().ToString(),
                cashierId = _services.User.Id,
                branchId = (string?)null,
                openingCash = Formatters.ParseMoney(values["openingCash"]),
                openNote = string.IsNullOrWhiteSpace(values["note"]) ? null : values["note"].Trim(),
                openedAt = DateTime.Now.ToString("O")
            });
            StatusMessage = "Shift kasir berhasil dibuka.";
            await RefreshDataAsync();
        });
    }

    [RelayCommand]
    private async Task CloseShiftAsync(CashierShift? shift)
    {
        shift ??= SelectedShift;
        if (shift == null) return;
        if (shift.Status != "OPEN")
        {
            ErrorMessage = "Shift ini sudah ditutup.";
            return;
        }

        await RunAsync(async () =>
        {
            var sales = (await _services.Api.GetSalesAsync(null, null, null, 500))
                .Where(s => s.ShiftId == shift.Id)
                .ToList();
            var cashTransactions = (await _services.Api.GetCashTransactionsAsync(500))
                .Where(t => t.ShiftId == shift.Id)
                .ToList();

            decimal SumMethod(string method) => sales
                .Where(s => s.PaymentMethod.Equals(method, StringComparison.OrdinalIgnoreCase))
                .Sum(s => s.Total);

            var totalSales = sales.Sum(s => s.Total);
            var totalCash = SumMethod("cash");
            var totalQris = SumMethod("qris");
            var totalTransfer = SumMethod("transfer");
            var totalEwallet = SumMethod("ewallet");
            var cashIn = cashTransactions
                .Where(t => t.Type.Equals("IN", StringComparison.OrdinalIgnoreCase))
                .Sum(t => t.Amount);
            var cashOut = cashTransactions
                .Where(t => t.Type.Equals("OUT", StringComparison.OrdinalIgnoreCase))
                .Sum(t => t.Amount);
            var cashSystem = shift.OpeningCash + totalCash + cashIn - cashOut;

            var values = FormDialog.Show(
                System.Windows.Application.Current.MainWindow,
                "Tutup Shift Kasir",
                $"Total penjualan {Formatters.Rupiah(totalSales)} · {sales.Count} transaksi.\nKas sistem: {Formatters.Rupiah(cashSystem)}",
                new List<FormField>
                {
                    new() { Key = "cashCounted", Label = "Uang fisik dihitung (Rp)", Required = true, Value = cashSystem.ToString("0") },
                    new() { Key = "note", Label = "Catatan penutupan", Multiline = true }
                },
                "Tutup Shift");
            if (values == null) return;

            var cashCounted = Formatters.ParseMoney(values["cashCounted"]);
            var difference = cashCounted - cashSystem;

            await _services.Api.CloseShiftAsync(shift.Id, new
            {
                closedAt = DateTime.Now.ToString("O"),
                cashCounted,
                cashSystem,
                cashDifference = difference,
                totalSales,
                totalCash,
                totalQris,
                totalTransfer,
                totalEwallet,
                transactionCount = sales.Count,
                closeNote = string.IsNullOrWhiteSpace(values["note"]) ? null : values["note"].Trim()
            });

            StatusMessage = difference == 0
                ? "Shift ditutup. Kas sesuai."
                : $"Shift ditutup. Selisih kas {Formatters.Rupiah(difference)}.";
            await RefreshDataAsync();
        });
    }
}

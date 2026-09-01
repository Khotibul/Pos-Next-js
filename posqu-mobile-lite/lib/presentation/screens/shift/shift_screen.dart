import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/utils/currency_formatter.dart';
import '../../../core/utils/date_formatter.dart';
import '../../../data/repositories/cashier_shift_repository_impl.dart';
import '../../../domain/entities/cashier_shift.dart';
import '../../providers/auth/auth_provider.dart';
import '../kasir/kasir_screen.dart' show KasirScreen;
import '../../providers/shift/shift_provider.dart';

class ShiftScreen extends ConsumerWidget {
  const ShiftScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final userId = ref.watch(authStateProvider).maybeWhen(
          authenticated: (user) => user.id,
          orElse: () => '',
        );

    if (userId.isEmpty) {
      return Scaffold(
        appBar: AppBar(title: const Text('Shift Kasir')),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.lock_outline, size: 48),
                const SizedBox(height: 12),
                const Text('Silakan login sebagai kasir untuk mengelola shift.'),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Kembali'),
                ),
              ],
            ),
          ),
        ),
      );
    }

    final activeShiftAsync = ref.watch(activeShiftProvider(userId));
    final shiftsAsync = ref.watch(shiftsListProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Shift Kasir'),
        actions: [
          IconButton(
            tooltip: 'Refresh',
            icon: const Icon(Icons.refresh),
            onPressed: () {
              ref.invalidate(activeShiftProvider(userId));
              ref.invalidate(shiftsListProvider);
            },
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(activeShiftProvider(userId));
          ref.invalidate(shiftsListProvider);
          // tunggu keduanya selesai
          try {
            await ref.read(activeShiftProvider(userId).future);
          } catch (_) {}
          try {
            await ref.read(shiftsListProvider.future);
          } catch (_) {}
        },
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            activeShiftAsync.when(
              data: (activeShift) {
                if (activeShift == null) {
                  return _NoActiveShiftCard(
                    onOpen: () => _openShift(context, ref, userId),
                  );
                }
                return _ActiveShiftCard(
                  shift: activeShift,
                  onClose: () => _closeShift(context, ref, activeShift, userId),
                  onRefreshSummary: () => ref.read(cashierShiftRepositoryProvider).computeShiftSummary(activeShift),
                );
              },
              loading: () => const Card(
                child: Padding(
                  padding: EdgeInsets.all(32),
                  child: Center(child: CircularProgressIndicator()),
                ),
              ),
              error: (e, _) => Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Text('Gagal memuat shift aktif: $e'),
                ),
              ),
            ),
            const SizedBox(height: 20),
            Row(
              children: [
                Text('Riwayat Shift', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
                const Spacer(),
                TextButton.icon(
                  onPressed: () {
                    ref.invalidate(shiftsListProvider);
                  },
                  icon: const Icon(Icons.history, size: 16),
                  label: const Text('Muat ulang'),
                ),
              ],
            ),
            const SizedBox(height: 8),
            shiftsAsync.when(
              data: (shifts) {
                if (shifts.isEmpty) {
                  return const Card(
                    child: Padding(
                      padding: EdgeInsets.all(24),
                      child: Center(child: Text('Belum ada riwayat shift')),
                    ),
                  );
                }
                return Column(
                  children: shifts.map((s) => _ShiftHistoryTile(shift: s)).toList(),
                );
              },
              loading: () => const Card(
                child: Padding(
                  padding: EdgeInsets.all(24),
                  child: Center(child: CircularProgressIndicator()),
                ),
              ),
              error: (e, _) => Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Text('Gagal memuat riwayat: $e'),
                ),
              ),
            ),
            const SizedBox(height: 16),
            OutlinedButton.icon(
              onPressed: () {
                // navigasi cepat ke Kasir (gate akan minta buka shift jika belum)
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const KasirScreen()),
                );
              },
              icon: const Icon(Icons.point_of_sale),
              label: const Text('Buka Kasir'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _openShift(BuildContext context, WidgetRef ref, String userId) async {
    if (userId.isEmpty) return;
    final openingCashController = TextEditingController();
    final noteController = TextEditingController();

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => PopScope(
        canPop: false,
        child: AlertDialog(
          title: const Text('Buka Shift'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Set modal awal (opening cash) sebelum mulai transaksi kasir.'),
              const SizedBox(height: 16),
              TextField(
                controller: openingCashController,
                keyboardType: TextInputType.number,
                autofocus: true,
                decoration: const InputDecoration(
                  labelText: 'Saldo Awal',
                  prefixText: 'Rp ',
                  hintText: '0',
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: noteController,
                decoration: const InputDecoration(labelText: 'Catatan (opsional)'),
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(dialogContext, false), child: const Text('Batal')),
            FilledButton.icon(onPressed: () => Navigator.pop(dialogContext, true), icon: const Icon(Icons.play_arrow), label: const Text('Buka Shift')),
          ],
        ),
      ),
    );

    if (confirmed != true) {
      openingCashController.dispose();
      noteController.dispose();
      return;
    }
    final rawOpening = openingCashController.text;
    final rawNote = noteController.text;
    openingCashController.dispose();
    noteController.dispose();

    if (!context.mounted) return;
    final openingCash = double.tryParse(rawOpening.replaceAll(RegExp(r'[^0-9]'), '')) ?? 0;
    final ok = await ref.read(shiftControllerProvider.notifier).open(
          userId,
          openingCash: openingCash,
          openNote: rawNote.trim().isEmpty ? null : rawNote.trim(),
        );
    if (!context.mounted) return;
    ref.invalidate(shiftsListProvider);
    ScaffoldMessenger.maybeOf(context)?.showSnackBar(
      SnackBar(content: Text(ok ? 'Shift berhasil dibuka' : 'Gagal membuka shift')),
    );
  }

  Future<void> _closeShift(BuildContext context, WidgetRef ref, CashierShift shift, String userId) async {
    if (userId.isEmpty) return;
    final repo = ref.read(cashierShiftRepositoryProvider);
    final summaryResult = await repo.computeShiftSummary(shift);
    final summary = summaryResult.fold((_) => shift, (s) => s);

    if (!context.mounted) return;
    final cashCountedController = TextEditingController();
    final noteController = TextEditingController();

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => PopScope(
        canPop: false,
        child: AlertDialog(
          title: const Text('Tutup Shift'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _summaryRow(dialogContext, 'Total penjualan', CurrencyFormatter.format(summary.totalSales), bold: true),
                _summaryRow(dialogContext, 'Jumlah transaksi', '${summary.transactionCount}'),
                const Divider(),
                _summaryRow(dialogContext, 'Kas', CurrencyFormatter.format(summary.totalCash)),
                _summaryRow(dialogContext, 'QRIS', CurrencyFormatter.format(summary.totalQris)),
                _summaryRow(dialogContext, 'Transfer', CurrencyFormatter.format(summary.totalTransfer)),
                _summaryRow(dialogContext, 'E-wallet', CurrencyFormatter.format(summary.totalEwallet)),
                _summaryRow(dialogContext, 'Pengeluaran', CurrencyFormatter.format(summary.totalExpenses)),
                _summaryRow(dialogContext, 'Saldo awal', CurrencyFormatter.format(shift.openingCash)),
                _summaryRow(dialogContext, 'Kas sistem', CurrencyFormatter.format(summary.expectedBalance != 0 ? summary.expectedBalance : summary.cashSystem), bold: true),
                const Divider(),
                const SizedBox(height: 8),
                const Text('Masukkan uang aktual (cash counted) untuk menutup shift.', style: TextStyle(fontSize: 12)),
                const SizedBox(height: 12),
                TextField(
                  controller: cashCountedController,
                  keyboardType: TextInputType.number,
                  autofocus: true,
                  decoration: InputDecoration(labelText: 'Cash Counted', prefixText: 'Rp ', hintText: (summary.expectedBalance != 0 ? summary.expectedBalance : summary.cashSystem).toStringAsFixed(0)),
                ),
                const SizedBox(height: 12),
                TextField(controller: noteController, decoration: const InputDecoration(labelText: 'Catatan (opsional)')),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(dialogContext, false), child: const Text('Batal')),
            FilledButton.icon(onPressed: () => Navigator.pop(dialogContext, true), icon: const Icon(Icons.lock_outline), label: const Text('Tutup Shift')),
          ],
        ),
      ),
    );

    if (confirmed != true) {
      cashCountedController.dispose();
      noteController.dispose();
      return;
    }
    final rawCounted = cashCountedController.text;
    final rawCloseNote = noteController.text;
    cashCountedController.dispose();
    noteController.dispose();

    if (!context.mounted) return;
    final fallbackExpected = summary.expectedBalance != 0 ? summary.expectedBalance : summary.cashSystem;
    final cashCounted = double.tryParse(rawCounted.replaceAll(RegExp(r'[^0-9]'), '')) ?? fallbackExpected;
    final ok = await ref.read(shiftControllerProvider.notifier).close(
          shiftId: shift.id,
          cashierId: userId,
          cashCounted: cashCounted,
          closeNote: rawCloseNote.trim().isEmpty ? null : rawCloseNote.trim(),
        );
    if (!context.mounted) return;
    ref.invalidate(shiftsListProvider);
    ScaffoldMessenger.maybeOf(context)?.showSnackBar(
      SnackBar(content: Text(ok ? 'Shift ditutup' : 'Gagal menutup shift')),
    );
  }

  Widget _summaryRow(BuildContext context, String label, String value, {bool bold = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(fontSize: bold ? 14 : 12.5, fontWeight: bold ? FontWeight.bold : FontWeight.normal)),
          Text(value, style: TextStyle(fontSize: bold ? 16 : 12.5, fontWeight: bold ? FontWeight.bold : FontWeight.normal)),
        ],
      ),
    );
  }
}

class _NoActiveShiftCard extends StatelessWidget {
  final VoidCallback onOpen;
  const _NoActiveShiftCard({required this.onOpen});
  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Icon(Icons.shield_outlined, size: 48, color: Theme.of(context).colorScheme.primary),
            const SizedBox(height: 8),
            const Text('Tidak ada shift aktif', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
            const SizedBox(height: 6),
            const Text('Buka shift terlebih dahulu sebelum transaksi kasir.', textAlign: TextAlign.center),
            const SizedBox(height: 16),
            FilledButton.icon(onPressed: onOpen, icon: const Icon(Icons.play_arrow), label: const Text('Buka Shift')),
          ],
        ),
      ),
    );
  }
}

class _ActiveShiftCard extends StatelessWidget {
  final CashierShift shift;
  final VoidCallback onClose;
  final Future<dynamic> Function() onRefreshSummary;
  const _ActiveShiftCard({required this.shift, required this.onClose, required this.onRefreshSummary});

  @override
  Widget build(BuildContext context) {
    return Card(
      color: Theme.of(context).colorScheme.primaryContainer,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.shield_outlined, color: Theme.of(context).colorScheme.onPrimaryContainer),
                const SizedBox(width: 8),
                Text('Shift Aktif', style: TextStyle(fontWeight: FontWeight.bold, color: Theme.of(context).colorScheme.onPrimaryContainer)),
                const Spacer(),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(color: Colors.green, borderRadius: BorderRadius.circular(20)),
                  child: const Text('OPEN', style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
                ),
              ],
            ),
            const SizedBox(height: 12),
            _infoRow('Dibuka', '${DateFormatter.formatDate(shift.openedAt)} • ${DateFormatter.formatTime(shift.openedAt)}'),
            const SizedBox(height: 6),
            _infoRow('Saldo awal', CurrencyFormatter.format(shift.openingCash)),
            if (shift.openNote != null && shift.openNote!.isNotEmpty) ...[
              const SizedBox(height: 6),
              _infoRow('Catatan', shift.openNote!),
            ],
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                style: FilledButton.styleFrom(backgroundColor: Colors.orange),
                onPressed: onClose,
                icon: const Icon(Icons.lock_outline),
                label: const Text('Tutup Shift'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _infoRow(String label, String value) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(width: 80, child: Text(label, style: const TextStyle(fontSize: 12.5, color: Colors.black54))),
        Expanded(child: Text(value, style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600))),
      ],
    );
  }
}

class _ShiftHistoryTile extends StatelessWidget {
  final CashierShift shift;
  const _ShiftHistoryTile({required this.shift});
  @override
  Widget build(BuildContext context) {
    final isOpen = shift.status == 'OPEN';
    final closedText = shift.closedAt != null ? DateFormatter.formatTime(shift.closedAt!) : '-';
    final subtitle = isOpen
        ? 'Dibuka ${DateFormatter.formatTime(shift.openedAt)} • OPEN'
        : 'Ditutup $closedText • ${shift.transactionCount} trx';
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: Icon(isOpen ? Icons.timelapse : Icons.check_circle, color: isOpen ? Colors.orange : Colors.green),
        title: Text('Shift ${DateFormatter.formatDate(shift.openedAt)}', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
        subtitle: Text(subtitle, style: const TextStyle(fontSize: 11)),
        trailing: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(CurrencyFormatter.format(shift.totalSales == 0 ? shift.openingCash : shift.totalSales), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
            Text(shift.status, style: TextStyle(fontSize: 10, color: isOpen ? Colors.orange : Colors.green, fontWeight: FontWeight.bold)),
          ],
        ),
      ),
    );
  }
}

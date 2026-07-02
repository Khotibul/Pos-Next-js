import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../providers/cash/cash_provider.dart';
import '../../../core/utils/currency_formatter.dart';
import '../../../core/utils/date_formatter.dart';

class CashScreen extends ConsumerWidget {
  const CashScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final balanceAsync = ref.watch(cashBalanceProvider);
    final transactionsAsync = ref.watch(cashTransactionsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Kas')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                children: [
                  Text('Saldo Kas', style: Theme.of(context).textTheme.bodyMedium),
                  const SizedBox(height: 8),
                  balanceAsync.when(
                    data: (balance) => Text(
                      CurrencyFormatter.format(balance),
                      style: Theme.of(context).textTheme.headlineLarge?.copyWith(
                            fontWeight: FontWeight.bold,
                            color: Theme.of(context).colorScheme.primary,
                          ),
                    ),
                    loading: () => const CircularProgressIndicator(),
                    error: (_, __) => const Text('Rp 0'),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: Card(
                  child: ListTile(
                    leading: const Icon(Icons.add_circle, color: Colors.green),
                    title: const Text('Pemasukan'),
                    onTap: () => _addTransaction(context, 'income'),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Card(
                  child: ListTile(
                    leading: const Icon(Icons.remove_circle, color: Colors.red),
                    title: const Text('Pengeluaran'),
                    onTap: () => _addTransaction(context, 'expense'),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Text('Riwayat Transaksi', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          transactionsAsync.when(
            data: (transactions) {
              if (transactions.isEmpty) {
                return const Card(
                  child: Padding(
                    padding: EdgeInsets.all(24),
                    child: Center(child: Text('Belum ada transaksi')),
                  ),
                );
              }
              return ListView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: transactions.length,
                itemBuilder: (context, index) {
                  final t = transactions[index];
                  return Card(
                    child: ListTile(
                      leading: Icon(
                        t.type == 'income' ? Icons.arrow_downward : Icons.arrow_upward,
                        color: t.type == 'income' ? Colors.green : Colors.red,
                      ),
                      title: Text(t.description ?? t.category),
                      subtitle: Text(DateFormatter.formatDateTime(t.transactionDate)),
                      trailing: Text(
                        CurrencyFormatter.format(t.amount),
                        style: TextStyle(
                          color: t.type == 'income' ? Colors.green : Colors.red,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  );
                },
              );
            },
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (_, __) => const Text('Gagal memuat'),
          ),
        ],
      ),
    );
  }

  void _addTransaction(BuildContext context, String type) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(type == 'income' ? 'Tambah Pemasukan' : 'Tambah Pengeluaran'),
        content: const Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              decoration: InputDecoration(labelText: 'Jumlah', prefixText: 'Rp '),
              keyboardType: TextInputType.number,
            ),
            SizedBox(height: 12),
            TextField(
              decoration: InputDecoration(labelText: 'Keterangan'),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Batal')),
          FilledButton(onPressed: () => Navigator.pop(context), child: const Text('Simpan')),
        ],
      ),
    );
  }
}

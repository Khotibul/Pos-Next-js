import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/utils/currency_formatter.dart';
import '../../../core/utils/date_formatter.dart';

class ShiftScreen extends ConsumerWidget {
  const ShiftScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(title: const Text('Shift Kasir')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  Icon(Icons.shield_outlined, size: 48, color: Theme.of(context).colorScheme.primary),
                  const SizedBox(height: 8),
                  const Text('Tidak ada shift aktif', style: TextStyle(fontSize: 16)),
                  const SizedBox(height: 16),
                  FilledButton.icon(
                    onPressed: () => _openShift(context),
                    icon: const Icon(Icons.play_arrow),
                    label: const Text('Buka Shift'),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          Text('Riwayat Shift', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          Card(
            child: ListTile(
              leading: const Icon(Icons.check_circle, color: Colors.green),
              title: Text('Shift ${DateFormatter.formatDate(DateTime.now().subtract(const Duration(days: 1)))}'),
              subtitle: Text('Ditutup ${DateFormatter.formatTime(DateTime.now().subtract(const Duration(hours: 16)))}'),
              trailing: Text(CurrencyFormatter.format(1500000)),
            ),
          ),
        ],
      ),
    );
  }

  void _openShift(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Buka Shift'),
        content: const TextField(
          keyboardType: TextInputType.number,
          decoration: InputDecoration(
            labelText: 'Saldo Awal',
            prefixText: 'Rp ',
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Batal')),
          FilledButton(onPressed: () => Navigator.pop(context), child: const Text('Buka Shift')),
        ],
      ),
    );
  }
}

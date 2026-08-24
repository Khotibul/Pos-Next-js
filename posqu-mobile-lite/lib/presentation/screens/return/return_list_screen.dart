import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../providers/return/return_provider.dart';
import '../../../core/utils/currency_formatter.dart';
import '../../../core/utils/date_formatter.dart';
import '../../../core/widgets/empty_state.dart';
import '../../../core/widgets/loading_widget.dart';

class ReturnListScreen extends ConsumerWidget {
  const ReturnListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final returnsAsync = ref.watch(returnListProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Retur')),
      body: returnsAsync.when(
        data: (returns) {
          if (returns.isEmpty) {
            return const EmptyState(
              icon: Icons.assignment_return_outlined,
              title: 'Belum ada retur',
              actionLabel: 'Buat Retur',
            );
          }
          return ListView.builder(
            padding: const EdgeInsets.all(12),
            itemCount: returns.length,
            itemBuilder: (context, index) {
              final returnData = returns[index];
              return Card(
                child: ListTile(
                  leading: CircleAvatar(
                    backgroundColor: Colors.orange.withValues(alpha: 0.1),
                    child: const Icon(Icons.assignment_return, color: Colors.orange),
                  ),
                  title: Text(returnData.returnNumber),
                  subtitle: Text(
                    '${DateFormatter.formatDate(returnData.returnDate)} | ${returnData.reason}',
                  ),
                  trailing: Text(
                    CurrencyFormatter.format(returnData.total),
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                ),
              );
            },
          );
        },
        loading: () => const LoadingCard(),
        error: (_, __) => const EmptyState(
          icon: Icons.error_outline,
          title: 'Gagal memuat data',
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => context.push('/returns/add'),
        child: const Icon(Icons.add),
      ),
    );
  }
}


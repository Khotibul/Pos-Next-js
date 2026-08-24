import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../providers/purchase/purchase_provider.dart';
import '../../../core/utils/currency_formatter.dart';
import '../../../core/utils/date_formatter.dart';
import '../../../core/widgets/empty_state.dart';
import '../../../core/widgets/loading_widget.dart';

class PurchaseListScreen extends ConsumerWidget {
  const PurchaseListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final purchasesAsync = ref.watch(purchaseListProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Pembelian')),
      body: purchasesAsync.when(
        data: (purchases) {
          if (purchases.isEmpty) {
            return const EmptyState(
              icon: Icons.add_shopping_cart_outlined,
              title: 'Belum ada pembelian',
              actionLabel: 'Buat Pembelian',
            );
          }
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(purchaseListProvider),
            child: ListView.builder(
              padding: const EdgeInsets.all(12),
              itemCount: purchases.length,
              itemBuilder: (context, index) {
                final purchase = purchases[index];
                return Card(
                  child: ListTile(
                    leading: CircleAvatar(
                      backgroundColor: Theme.of(context).colorScheme.secondaryContainer,
                      child: Icon(Icons.shopping_cart,
                          color: Theme.of(context).colorScheme.secondary),
                    ),
                    title: Text(purchase.orderNo),
                    subtitle: Text(
                      purchase.supplierName ?? DateFormatter.formatDate(purchase.createdAt),
                    ),
                    trailing: Text(
                      CurrencyFormatter.format(purchase.total),
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                  ),
                );
              },
            ),
          );
        },
        loading: () => const LoadingCard(),
        error: (_, __) => const EmptyState(
          icon: Icons.error_outline,
          title: 'Gagal memuat data',
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => context.push('/purchases/add'),
        child: const Icon(Icons.add),
      ),
    );
  }
}


import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../providers/customer/customer_provider.dart';
import '../../../core/utils/currency_formatter.dart';
import '../../../core/widgets/empty_state.dart';
import '../../../core/widgets/loading_widget.dart';

class CustomerListScreen extends ConsumerWidget {
  const CustomerListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final customersAsync = ref.watch(customerListProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Pelanggan')),
      body: customersAsync.when(
        data: (customers) {
          if (customers.isEmpty) {
            return const EmptyState(
              icon: Icons.people_outline,
              title: 'Belum ada pelanggan',
              actionLabel: 'Tambah Pelanggan',
            );
          }
          return ListView.builder(
            padding: const EdgeInsets.all(12),
            itemCount: customers.length,
            itemBuilder: (context, index) {
              final customer = customers[index];
              return Card(
                child: ListTile(
                  leading: CircleAvatar(
                    backgroundColor: Theme.of(context).colorScheme.primaryContainer,
                    child: Text(
                      customer.name[0].toUpperCase(),
                      style: TextStyle(color: Theme.of(context).colorScheme.primary),
                    ),
                  ),
                  title: Text(customer.name),
                  subtitle: Text(customer.phone ?? ''),
                  trailing: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(CurrencyFormatter.format(customer.totalPurchase)),
                      Text('${customer.purchaseCount} transaksi',
                          style: Theme.of(context).textTheme.bodySmall),
                    ],
                  ),
                  onTap: () => context.go('/customers/edit/${customer.id}'),
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
        onPressed: () => context.go('/customers/add'),
        child: const Icon(Icons.add),
      ),
    );
  }
}


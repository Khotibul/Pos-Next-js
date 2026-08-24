import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../providers/supplier/supplier_provider.dart';
import '../../../core/widgets/empty_state.dart';
import '../../../core/widgets/loading_widget.dart';

class SupplierListScreen extends ConsumerWidget {
  const SupplierListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final suppliersAsync = ref.watch(supplierListProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Supplier')),
      body: suppliersAsync.when(
        data: (suppliers) {
          if (suppliers.isEmpty) {
            return const EmptyState(
              icon: Icons.local_shipping_outlined,
              title: 'Belum ada supplier',
              actionLabel: 'Tambah Supplier',
            );
          }
          return ListView.builder(
            padding: const EdgeInsets.all(12),
            itemCount: suppliers.length,
            itemBuilder: (context, index) {
              final supplier = suppliers[index];
              return Card(
                child: ListTile(
                  leading: CircleAvatar(
                    backgroundColor: Theme.of(context).colorScheme.primaryContainer,
                    child: Icon(Icons.business, color: Theme.of(context).colorScheme.primary),
                  ),
                  title: Text(supplier.name),
                  subtitle: Text(supplier.phone ?? supplier.city ?? ''),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => context.push('/suppliers/edit/${supplier.id}'),
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
        onPressed: () => context.push('/suppliers/add'),
        child: const Icon(Icons.add),
      ),
    );
  }
}


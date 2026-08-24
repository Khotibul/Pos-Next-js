import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../providers/category/category_provider.dart';
import '../../../core/widgets/empty_state.dart';
import '../../../core/widgets/loading_widget.dart';

class CategoryListScreen extends ConsumerWidget {
  const CategoryListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final categoriesAsync = ref.watch(categoryListProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Kategori')),
      body: categoriesAsync.when(
        data: (categories) {
          if (categories.isEmpty) {
            return const EmptyState(
              icon: Icons.category_outlined,
              title: 'Belum ada kategori',
              actionLabel: 'Tambah Kategori',
            );
          }
          return ListView.builder(
            padding: const EdgeInsets.all(12),
            itemCount: categories.length,
            itemBuilder: (context, index) {
              final category = categories[index];
              return Card(
                child: ListTile(
                  leading: CircleAvatar(
                    backgroundColor: Theme.of(context).colorScheme.primaryContainer,
                    child: Icon(Icons.folder, color: Theme.of(context).colorScheme.primary),
                  ),
                  title: Text(category.name),
                  subtitle: Text('${category.productCount} produk'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => context.push('/categories/edit/${category.id}'),
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
        onPressed: () => context.push('/categories/add'),
        child: const Icon(Icons.add),
      ),
    );
  }
}


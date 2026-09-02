import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../providers/product/product_provider.dart';
import '../../../core/utils/currency_formatter.dart';
import '../../../core/widgets/empty_state.dart';
import '../../../core/widgets/loading_widget.dart';
import '../../../core/widgets/product_image.dart';

class ProductListScreen extends ConsumerWidget {
  const ProductListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final productsAsync = ref.watch(productListProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Produk'),
        actions: [
          IconButton(
            icon: const Icon(Icons.search),
            onPressed: () {},
          ),
        ],
      ),
      body: productsAsync.when(
        data: (products) {
          if (products.isEmpty) {
            return const EmptyState(
              icon: Icons.inventory_2_outlined,
              title: 'Belum ada produk',
              subtitle: 'Tambahkan produk pertama Anda',
              actionLabel: 'Tambah Produk',
            );
          }
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(productListProvider),
            child: ListView.builder(
              padding: const EdgeInsets.all(12),
              itemCount: products.length,
              itemBuilder: (context, index) {
                final product = products[index];
                return Card(
                  child: ListTile(
                    leading: ProductImageThumb(url: product.imageUrl, size: 48),
                    title: Text(product.name),
                    subtitle: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '${product.sku} | Stok: ${product.stock} ${product.unit}',
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                        if (product.wholesalePrice > 0 && product.wholesaleMinQty > 0)
                          Text(
                            'Grosir: ${CurrencyFormatter.format(product.wholesalePrice)} (min ${product.wholesaleMinQty})',
                            style: Theme.of(context)
                                .textTheme
                                .bodySmall
                                ?.copyWith(color: Colors.blue),
                          ),
                      ],
                    ),
                    trailing: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          CurrencyFormatter.format(product.sellingPrice),
                          style: const TextStyle(fontWeight: FontWeight.bold),
                        ),
                        if (product.isLowStock)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: Colors.orange.withOpacity(0.1),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: const Text(
                              'Stok Menipis',
                              style: TextStyle(fontSize: 10, color: Colors.orange),
                            ),
                          ),
                      ],
                    ),
                    onTap: () => context.push('/products/edit/${product.id}'),
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
        onPressed: () => context.push('/products/add'),
        child: const Icon(Icons.add),
      ),
    );
  }
}


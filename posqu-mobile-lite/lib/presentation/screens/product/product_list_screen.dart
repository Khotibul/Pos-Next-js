import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:file_picker/file_picker.dart';

import '../../providers/product/product_provider.dart';
import '../../../core/utils/currency_formatter.dart';
import '../../../core/widgets/empty_state.dart';
import '../../../core/widgets/loading_widget.dart';
import '../../../core/widgets/product_image.dart';
import '../../../data/services/product_excel_service.dart';
import '../../../data/repositories/product_repository_impl.dart';

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
            icon: const Icon(Icons.file_upload_outlined),
            tooltip: 'Import Excel',
            onPressed: () => _importExcel(context, ref),
          ),
          IconButton(
            icon: const Icon(Icons.file_download_outlined),
            tooltip: 'Export Excel',
            onPressed: () => _exportExcel(context, ref),
          ),
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

  Future<void> _exportExcel(BuildContext context, WidgetRef ref) async {
    final productsAsync = ref.read(productListProvider);
    final products = productsAsync.valueOrNull;
    if (products == null || products.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Tidak ada produk untuk di-export')),
      );
      return;
    }
    try {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Mengekspor produk...')),
      );
      final path = await exportProductsToExcel(products);
      await shareProductExcel(path);
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Export ${products.length} produk berhasil')),
        );
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Gagal export: $e')),
        );
      }
    }
  }

  Future<void> _importExcel(BuildContext context, WidgetRef ref) async {
    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['xlsx', 'xls'],
      );
      if (result == null || result.files.isEmpty) return;

      final filePath = result.files.single.path;
      if (filePath == null) {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('File tidak valid')),
          );
        }
        return;
      }

      // Ambil SKU existing untuk cek duplikat
      final existingProducts = ref.read(productListProvider).valueOrNull ?? [];
      final existingBySku = {
        for (final p in existingProducts) p.sku: p,
      };

      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Membaca file Excel...')),
        );
      }

      final imported = await importProductsFromExcel(
        filePath,
        existingBySku: existingBySku,
      );

      if (imported.isEmpty) {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Tidak ada produk baru ditemukan (duplikat SKU atau data kosong)')),
          );
        }
        return;
      }

      // Tampilkan dialog konfirmasi
      if (!context.mounted) return;
      final confirmed = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Import Produk'),
          content: Text('Import ${imported.length} produk baru?'),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Batal')),
            TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Import')),
          ],
        ),
      );

      if (confirmed != true) return;

      // Insert setiap produk via repository
      final repository = ref.read(productRepositoryProvider);
      int success = 0;
      for (final product in imported) {
        try {
          final result = await repository.createProduct(product);
          if (result.isRight()) success++;
        } catch (_) {
          // skip gagal
        }
      }

      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Import berhasil: $success/${imported.length} produk')),
        );
        ref.invalidate(productListProvider);
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Gagal import: $e')),
        );
      }
    }
  }
}


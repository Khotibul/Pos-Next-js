import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../data/repositories/product_repository_impl.dart';
import '../../../domain/entities/product.dart';

final productListProvider = FutureProvider<List<Product>>((ref) async {
  final repository = ref.read(productRepositoryProvider);
  final result = await repository.getProducts();
  return result.fold((failure) => [], (products) => products);
});

final productSearchProvider = FutureProvider.family<List<Product>, String>(
  (ref, query) async {
    if (query.isEmpty) return [];
    final repository = ref.read(productRepositoryProvider);
    final result = await repository.searchProducts(query);
    return result.fold((failure) => [], (products) => products);
  },
);

final lowStockProductsProvider = FutureProvider<List<Product>>((ref) async {
  final repository = ref.read(productRepositoryProvider);
  final result = await repository.getLowStockProducts();
  return result.fold((failure) => [], (products) => products);
});

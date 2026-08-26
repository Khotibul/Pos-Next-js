import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';

import '../../../data/datasources/local/database/app_database.dart';
import '../../../data/repositories/category_repository_impl.dart';
import '../../../data/repositories/customer_repository_impl.dart';
import '../../../data/repositories/product_repository_impl.dart';
import '../../../data/repositories/sale_repository_impl.dart';
import '../../../data/repositories/supplier_repository_impl.dart';

class SyncStatusInfo {
  final int pendingSales;
  final int pendingProducts;
  final int pendingCategories;
  final int pendingCustomers;
  final int pendingSuppliers;
  final DateTime? lastSync;

  const SyncStatusInfo({
    this.pendingSales = 0,
    this.pendingProducts = 0,
    this.pendingCategories = 0,
    this.pendingCustomers = 0,
    this.pendingSuppliers = 0,
    this.lastSync,
  });

  int get totalPending =>
      pendingSales +
      pendingProducts +
      pendingCategories +
      pendingCustomers +
      pendingSuppliers;
}

/// Status sinkronisasi nyata: hitungan data lokal yang belum terkirim
/// ke server + waktu sinkronisasi terakhir.
final syncStatusProvider = FutureProvider<SyncStatusInfo>((ref) async {
  final db = ref.read(appDatabaseProvider);

  final sales = await db.saleDao.getUnsynced();
  final products = await db.productDao.getUnsynced();
  final categories = await db.categoryDao.getUnsynced();
  final customers = await db.customerDao.getUnsynced();
  final suppliers = await db.supplierDao.getUnsynced();

  final box = await Hive.openBox('cache');
  final lastMs = box.get('last_sync_at') as int?;

  return SyncStatusInfo(
    pendingSales: sales.length,
    pendingProducts: products.length,
    pendingCategories: categories.length,
    pendingCustomers: customers.length,
    pendingSuppliers: suppliers.length,
    lastSync:
        lastMs != null ? DateTime.fromMillisecondsSinceEpoch(lastMs) : null,
  );
});

class SyncActions {
  final Ref _ref;

  SyncActions(this._ref);

  /// Memicu sinkronisasi dua arah untuk semua entitas:
  /// push pending lokal -> tarik data server -> simpan waktu sync.
  /// Urutan: kategori & supplier dulu (dependensi produk), lalu produk, pelanggan, penjualan.
  Future<bool> syncNow() async {
    try {
      await _ref.read(categoryRepositoryProvider).getCategories();
      await _ref.read(supplierRepositoryProvider).getSuppliers();
      await _ref.read(customerRepositoryProvider).getCustomers();
      await _ref.read(productRepositoryProvider).getProducts();
      await _ref.read(saleRepositoryProvider).getSales();

      final box = await Hive.openBox('cache');
      await box.put('last_sync_at', DateTime.now().millisecondsSinceEpoch);
      return true;
    } catch (_) {
      return false;
    }
  }
}

final syncActionProvider = Provider<SyncActions>((ref) {
  return SyncActions(ref);
});

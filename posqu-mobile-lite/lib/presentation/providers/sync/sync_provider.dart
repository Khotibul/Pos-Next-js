import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';

import '../../../data/datasources/local/database/app_database.dart';
import '../../../data/datasources/remote/shift_remote_datasource.dart';
import '../../../data/repositories/category_repository_impl.dart';
import '../../../data/repositories/customer_repository_impl.dart';
import '../../../data/repositories/product_repository_impl.dart';
import '../../../data/repositories/sale_repository_impl.dart';
import '../../../data/repositories/supplier_repository_impl.dart';
import '../unit/unit_provider.dart';

class SyncStatusInfo {
  final int pendingSales;
  final int pendingProducts;
  final int pendingCategories;
  final int pendingCustomers;
  final int pendingSuppliers;
  final int pendingShifts;
  final DateTime? lastSync;

  const SyncStatusInfo({
    this.pendingSales = 0,
    this.pendingProducts = 0,
    this.pendingCategories = 0,
    this.pendingCustomers = 0,
    this.pendingSuppliers = 0,
    this.pendingShifts = 0,
    this.lastSync,
  });

  int get totalPending =>
      pendingSales +
      pendingProducts +
      pendingCategories +
      pendingCustomers +
      pendingSuppliers +
      pendingShifts;
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
  final shifts = await db.cashierShiftDao.getUnsynced();

  final box = Hive.isBoxOpen('cache') ? Hive.box('cache') : await Hive.openBox('cache');
  final lastMs = box.get('last_sync_at') as int?;

  return SyncStatusInfo(
    pendingSales: sales.length,
    pendingProducts: products.length,
    pendingCategories: categories.length,
    pendingCustomers: customers.length,
    pendingSuppliers: suppliers.length,
    pendingShifts: shifts.length,
    lastSync:
        lastMs != null ? DateTime.fromMillisecondsSinceEpoch(lastMs) : null,
  );
});

class SyncActions {
  final Ref _ref;
  bool _isSyncing = false;

  SyncActions(this._ref);

  /// Memicu sinkronisasi dua arah untuk semua entitas:
  /// push pending lokal -> tarik data server -> simpan waktu sync.
  /// Urutan: kategori & supplier dulu (dependensi produk), lalu produk, pelanggan, penjualan, shift.
  /// Guard mutex mencegah double-push concurrent (B21).
  Future<bool> syncNow() async {
    if (_isSyncing) return false;
    _isSyncing = true;
    try {
      await _ref.read(categoryRepositoryProvider).getCategories();
      await _ref.read(supplierRepositoryProvider).getSuppliers();
      await _ref.read(customerRepositoryProvider).getCustomers();
      await _ref.read(productRepositoryProvider).getProducts();
      await _ref.read(saleRepositoryProvider).getSales();
      await _pushPendingShifts();

      // Segarkan daftar satuan dari server (tombol/sumber dropdown produk).
      _ref.invalidate(unitsProvider);
      try {
        await _ref.read(unitsProvider.future);
      } catch (_) {}

      final box = Hive.isBoxOpen('cache') ? Hive.box('cache') : await Hive.openBox('cache');
      await box.put('last_sync_at', DateTime.now().millisecondsSinceEpoch);
      return true;
    } catch (_) {
      return false;
    } finally {
      _isSyncing = false;
    }
  }

  Future<void> _pushPendingShifts() async {
    try {
      final db = _ref.read(appDatabaseProvider);
      final remote = _ref.read(shiftRemoteDataSourceProvider);
      final pending = await db.cashierShiftDao.getUnsynced();
      for (final s in pending) {
        try {
          if (s.status == 'OPEN') {
            await remote.openShift({
              'id': s.id,
              'cashierId': s.cashierId,
              'branchId': s.branchId,
              'openingCash': s.openingCash,
              'openNote': s.openNote,
              'openedAt': s.openedAt.toIso8601String(),
            });
          } else {
            await remote.closeShift(s.id, {
              'closedAt': s.closedAt?.toIso8601String(),
              'cashCounted': s.cashCounted,
              'cashSystem': s.cashSystem,
              'cashDifference': s.cashDifference,
              'totalSales': s.totalSales,
              'totalCash': s.totalCash,
              'totalQris': s.totalQris,
              'totalTransfer': s.totalTransfer,
              'totalEwallet': s.totalEwallet,
              'transactionCount': s.transactionCount,
              'closeNote': s.closeNote,
            });
          }
          await db.cashierShiftDao.markSynced([s.id]);
        } catch (_) {
          // 404/501 di-disable via MobileApiGate (TTL 5-15 menit), hentikan retry untuk siklus ini
          break;
        }
      }
    } catch (_) {}
  }
}

final syncActionProvider = Provider<SyncActions>((ref) {
  return SyncActions(ref);
});

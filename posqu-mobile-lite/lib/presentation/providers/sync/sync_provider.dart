import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';

import '../../../data/datasources/local/database/app_database.dart';
import '../../../data/datasources/remote/cash_transaction_remote_datasource.dart';
import '../../../data/datasources/remote/purchase_remote_datasource.dart';
import '../../../data/datasources/remote/return_remote_datasource.dart';
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
  final int pendingPurchases;
  final int pendingReturns;
  final int pendingCashTransactions;
  final DateTime? lastSync;

  const SyncStatusInfo({
    this.pendingSales = 0,
    this.pendingProducts = 0,
    this.pendingCategories = 0,
    this.pendingCustomers = 0,
    this.pendingSuppliers = 0,
    this.pendingShifts = 0,
    this.pendingPurchases = 0,
    this.pendingReturns = 0,
    this.pendingCashTransactions = 0,
    this.lastSync,
  });

  int get totalPending =>
      pendingSales +
      pendingProducts +
      pendingCategories +
      pendingCustomers +
      pendingSuppliers +
      pendingShifts +
      pendingPurchases +
      pendingReturns +
      pendingCashTransactions;
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
  final purchases = await db.purchaseDao.getUnsynced();
  final returns = await db.returnDao.getUnsynced();
  final cashTx = await db.cashTransactionDao.getUnsynced();

  final box = Hive.isBoxOpen('cache') ? Hive.box('cache') : await Hive.openBox('cache');
  final lastMs = box.get('last_sync_at') as int?;

  return SyncStatusInfo(
    pendingSales: sales.length,
    pendingProducts: products.length,
    pendingCategories: categories.length,
    pendingCustomers: customers.length,
    pendingSuppliers: suppliers.length,
    pendingShifts: shifts.length,
    pendingPurchases: purchases.length,
    pendingReturns: returns.length,
    pendingCashTransactions: cashTx.length,
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
  /// Urutan: kategori & supplier dulu (dependensi produk), lalu produk, pelanggan, penjualan, shift, purchase, return, cash.
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
      await _pushPendingPurchases();
      await _pushPendingReturns();
      await _pushPendingCashTransactions();

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
          break;
        }
      }
    } catch (_) {}
  }

  Future<void> _pushPendingPurchases() async {
    try {
      final db = _ref.read(appDatabaseProvider);
      final remote = _ref.read(purchaseRemoteDataSourceProvider);
      final pending = await db.purchaseDao.getUnsynced();
      for (final p in pending) {
        try {
          final items = await db.purchaseDao.getItems(p.id);
          await remote.createPurchase({
            'id': p.id,
            'orderNo': p.orderNo,
            'supplierId': p.supplierId,
            'status': p.status,
            'subtotal': p.subtotal,
            'tax': p.tax,
            'total': p.total,
            'notes': p.notes,
            'createdAt': p.createdAt.toIso8601String(),
            'items': items.map((i) => {'productId': i.productId, 'qty': i.qty, 'price': i.costPrice}).toList(),
          });
          await db.purchaseDao.markSynced([p.id]);
        } catch (_) {
          break;
        }
      }
    } catch (_) {}
  }

  Future<void> _pushPendingReturns() async {
    try {
      final db = _ref.read(appDatabaseProvider);
      final remote = _ref.read(returnRemoteDataSourceProvider);
      final pending = await db.returnDao.getUnsynced();
      for (final r in pending) {
        try {
          final items = await db.returnDao.getItems(r.id);
          await remote.createReturn({
            'id': r.id,
            'returnNumber': r.returnNumber,
            'saleId': r.saleId,
            'type': r.type,
            'reason': r.reason,
            'total': r.total,
            'items': items.map((i) => {'productId': i.productId, 'quantity': i.quantity, 'price': i.price}).toList(),
          });
          await db.returnDao.markSynced([r.id]);
        } catch (_) {
          break;
        }
      }
    } catch (_) {}
  }

  Future<void> _pushPendingCashTransactions() async {
    try {
      final db = _ref.read(appDatabaseProvider);
      final remote = _ref.read(cashTransactionRemoteDataSourceProvider);
      final pending = await db.cashTransactionDao.getUnsynced();
      for (final c in pending) {
        try {
          await remote.createTransaction({
            'id': c.id,
            'shiftId': c.shiftId,
            'type': c.type,
            'category': c.category,
            'amount': c.amount,
            'description': c.description,
            'transactionDate': c.transactionDate.toIso8601String(),
            'userId': c.userId,
          });
          await db.cashTransactionDao.markSynced([c.id]);
        } catch (_) {
          break;
        }
      }
    } catch (_) {}
  }
}

final syncActionProvider = Provider<SyncActions>((ref) {
  return SyncActions(ref);
});

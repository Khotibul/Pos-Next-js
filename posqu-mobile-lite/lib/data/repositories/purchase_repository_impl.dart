import 'package:dartz/dartz.dart';
import 'package:drift/drift.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/errors/failures.dart';
import '../../domain/entities/purchase.dart';
import '../../domain/repositories/purchase_repository.dart';
import '../datasources/local/database/app_database.dart';

final purchaseRepositoryProvider = Provider<PurchaseRepository>((ref) {
  return PurchaseRepositoryImpl(database: ref.read(appDatabaseProvider));
});

class PurchaseRepositoryImpl implements PurchaseRepository {
  final AppDatabase database;

  PurchaseRepositoryImpl({required this.database});

  @override
  Future<Either<Failure, Purchase>> createPurchase(Purchase purchase) async {
    try {
      await database.transaction(() async {
        await database.purchaseDao.insertPurchase(
          PurchasesTableCompanion(
            id: Value(purchase.id),
            orderNo: Value(purchase.orderNo),
            supplierId: Value(purchase.supplierId),
            status: Value(purchase.status),
            subtotal: Value(purchase.subtotal),
            tax: Value(purchase.tax),
            total: Value(purchase.total),
            notes: Value(purchase.notes),
            isSynced: const Value(false),
          ),
        );
        for (final item in purchase.items) {
          await database.purchaseDao.insertPurchaseItem(
            PurchaseItemsTableCompanion(
              id: Value(item.id),
              purchaseOrderId: Value(purchase.id),
              productId: Value(item.productId),
              name: Value(item.name),
              sku: Value(item.sku),
              costPrice: Value(item.costPrice),
              qty: Value(item.qty),
              lineTotal: Value(item.lineTotal),
            ),
          );
          final product = await database.productDao.getById(item.productId);
          if (product != null) {
            await database.productDao.updateStock(
              item.productId,
              product.stock + item.qty.toInt(),
            );
          }
        }
      });
      return Right(purchase);
    } catch (e) {
      return Left(DatabaseFailure(message: 'Gagal menyimpan pembelian: $e'));
    }
  }

  @override
  Future<Either<Failure, void>> deletePurchase(String id) async {
    try {
      await database.purchaseDao.deletePurchase(id);
      return const Right(null);
    } catch (e) {
      return const Left(DatabaseFailure(message: 'Gagal menghapus pembelian'));
    }
  }

  @override
  Future<Either<Failure, Purchase>> getPurchase(String id) async {
    try {
      final purchase = await database.purchaseDao.getById(id);
      if (purchase == null) {
        return const Left(DatabaseFailure(message: 'Pembelian tidak ditemukan'));
      }
      final items = await database.purchaseDao.getItems(id);
      String? supplierName;
      if (purchase.supplierId != null) {
        final supplier =
            await database.supplierDao.getById(purchase.supplierId!);
        supplierName = supplier?.name;
      }
      return Right(_toEntity(purchase, items, supplierName));
    } catch (e) {
      return const Left(DatabaseFailure(message: 'Gagal mengambil pembelian'));
    }
  }

  @override
  Future<Either<Failure, List<Purchase>>> getPurchases({
    int page = 1,
    int limit = 20,
    String? search,
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    try {
      final purchases = await database.purchaseDao.getAll(
        search: search,
        startDate: startDate,
        endDate: endDate,
      );
      final result = <Purchase>[];
      for (final p in purchases) {
        final items = await database.purchaseDao.getItems(p.id);
        result.add(_toEntity(p, items, null));
      }
      return Right(result);
    } catch (e) {
      return const Left(DatabaseFailure(message: 'Gagal mengambil pembelian'));
    }
  }

  Purchase _toEntity(
    PurchasesTableData p,
    List<PurchaseItemsTableData> items,
    String? supplierName,
  ) {
    return Purchase(
      id: p.id,
      orderNo: p.orderNo,
      supplierId: p.supplierId,
      supplierName: supplierName,
      status: p.status,
      subtotal: p.subtotal,
      tax: p.tax,
      total: p.total,
      notes: p.notes,
      items: items.map((i) => PurchaseItem(
        id: i.id,
        purchaseOrderId: i.purchaseOrderId,
        productId: i.productId,
        name: i.name,
        sku: i.sku,
        qty: i.qty,
        costPrice: i.costPrice,
        lineTotal: i.lineTotal,
      )).toList(),
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    );
  }
}

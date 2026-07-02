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
      final companion = PurchasesTableCompanion(
        invoiceNumber: Value(purchase.invoiceNumber),
        supplierId: Value(purchase.supplierId),
        userId: Value(purchase.userId),
        purchaseDate: Value(purchase.purchaseDate),
        status: Value(purchase.status),
        subtotal: Value(purchase.subtotal),
        discount: Value(purchase.discount),
        tax: Value(purchase.tax),
        total: Value(purchase.total),
        notes: Value(purchase.notes),
        isSynced: const Value(false),
      );
      final purchaseId = await database.purchaseDao.insertPurchase(companion);
      for (final item in purchase.items) {
        await database.purchaseDao.insertPurchaseItem(
          PurchaseItemsTableCompanion(
            purchaseId: Value(purchaseId),
            productId: Value(item.productId),
            quantity: Value(item.quantity),
            purchasePrice: Value(item.purchasePrice),
            subtotal: Value(item.subtotal),
          ),
        );
        await database.productDao.updateStock(
          item.productId,
          item.quantity.toInt(),
        );
      }
      return Right(purchase);
    } catch (e) {
      return const Left(DatabaseFailure(message: 'Gagal menyimpan pembelian'));
    }
  }

  @override
  Future<Either<Failure, void>> deletePurchase(int id) async {
    try {
      await database.purchaseDao.deletePurchase(id);
      return const Right(null);
    } catch (e) {
      return const Left(DatabaseFailure(message: 'Gagal menghapus pembelian'));
    }
  }

  @override
  Future<Either<Failure, Purchase>> getPurchase(int id) async {
    try {
      final purchase = await database.purchaseDao.getById(id);
      if (purchase == null) {
        return const Left(DatabaseFailure(message: 'Pembelian tidak ditemukan'));
      }
      final items = await database.purchaseDao.getItems(id);
      return Right(_toEntity(purchase, items));
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
        result.add(_toEntity(p, items));
      }
      return Right(result);
    } catch (e) {
      return const Left(DatabaseFailure(message: 'Gagal mengambil pembelian'));
    }
  }

  Purchase _toEntity(PurchasesTableData p, List<PurchaseItemsTableData> items) {
    return Purchase(
      id: p.id,
      invoiceNumber: p.invoiceNumber,
      supplierId: p.supplierId,
      userId: p.userId,
      purchaseDate: p.purchaseDate,
      status: p.status,
      subtotal: p.subtotal,
      discount: p.discount,
      tax: p.tax,
      total: p.total,
      notes: p.notes,
      items: items.map((i) => PurchaseItem(
        id: i.id,
        purchaseId: i.purchaseId,
        productId: i.productId,
        quantity: i.quantity,
        purchasePrice: i.purchasePrice,
        subtotal: i.subtotal,
      )).toList(),
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    );
  }
}

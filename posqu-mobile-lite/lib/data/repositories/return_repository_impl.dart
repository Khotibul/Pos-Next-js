import 'package:dartz/dartz.dart';
import 'package:drift/drift.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/errors/failures.dart';
import '../../domain/entities/return.dart';
import '../../domain/repositories/return_repository.dart';
import '../datasources/local/database/app_database.dart';

final returnRepositoryProvider = Provider<ReturnRepository>((ref) {
  return ReturnRepositoryImpl(database: ref.read(appDatabaseProvider));
});

class ReturnRepositoryImpl implements ReturnRepository {
  final AppDatabase database;

  ReturnRepositoryImpl({required this.database});

  @override
  Future<Either<Failure, Return>> createReturn(Return returnData) async {
    try {
      final companion = ReturnsTableCompanion(
        returnNumber: Value(returnData.returnNumber),
        saleId: Value(returnData.saleId),
        purchaseId: Value(returnData.purchaseId),
        type: Value(returnData.type),
        userId: Value(returnData.userId),
        customerId: Value(returnData.customerId),
        supplierId: Value(returnData.supplierId),
        returnDate: Value(returnData.returnDate),
        reason: Value(returnData.reason),
        status: Value(returnData.status),
        total: Value(returnData.total),
        notes: Value(returnData.notes),
        isSynced: const Value(false),
      );
      final returnId = await database.returnDao.insertReturn(companion);
      for (final item in returnData.items) {
        await database.returnDao.insertReturnItem(
          ReturnItemsTableCompanion(
            returnId: Value(returnId),
            productId: Value(item.productId),
            quantity: Value(item.quantity),
            price: Value(item.price),
            subtotal: Value(item.subtotal),
            reason: Value(item.reason),
          ),
        );
      }
      return Right(returnData);
    } catch (e) {
      return const Left(DatabaseFailure(message: 'Gagal menyimpan retur'));
    }
  }

  @override
  Future<Either<Failure, Return>> getReturn(int id) async {
    try {
      final returnData = await database.returnDao.getById(id);
      if (returnData == null) {
        return const Left(DatabaseFailure(message: 'Retur tidak ditemukan'));
      }
      final items = await database.returnDao.getItems(id);
      return Right(_toEntity(returnData, items));
    } catch (e) {
      return const Left(DatabaseFailure(message: 'Gagal mengambil retur'));
    }
  }

  @override
  Future<Either<Failure, List<Return>>> getReturns({
    int page = 1,
    int limit = 20,
    String? search,
    DateTime? startDate,
    DateTime? endDate,
    String? type,
  }) async {
    try {
      final returns = await database.returnDao.getAll(
        search: search,
        startDate: startDate,
        endDate: endDate,
        type: type,
      );
      final result = <Return>[];
      for (final r in returns) {
        final items = await database.returnDao.getItems(r.id);
        result.add(_toEntity(r, items));
      }
      return Right(result);
    } catch (e) {
      return const Left(DatabaseFailure(message: 'Gagal mengambil retur'));
    }
  }

  Return _toEntity(ReturnsTableData r, List<ReturnItemsTableData> items) {
    return Return(
      id: r.id,
      returnNumber: r.returnNumber,
      saleId: r.saleId,
      purchaseId: r.purchaseId,
      type: r.type,
      userId: r.userId,
      customerId: r.customerId,
      supplierId: r.supplierId,
      returnDate: r.returnDate,
      reason: r.reason,
      status: r.status,
      total: r.total,
      notes: r.notes,
      items: items.map((i) => ReturnItem(
        id: i.id,
        returnId: i.returnId,
        productId: i.productId,
        quantity: i.quantity,
        price: i.price,
        subtotal: i.subtotal,
        reason: i.reason,
      )).toList(),
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    );
  }
}

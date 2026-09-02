import 'package:dartz/dartz.dart';
import 'package:dio/dio.dart' show DioException;
import 'package:drift/drift.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';

import '../../core/errors/failures.dart';
import '../../core/network/mobile_api_gate.dart';
import '../../core/network/network_info.dart';
import '../../domain/entities/return.dart';
import '../../domain/repositories/return_repository.dart';
import '../datasources/local/database/app_database.dart';
import '../datasources/remote/return_remote_datasource.dart';

final returnRepositoryProvider = Provider<ReturnRepository>((ref) {
  return ReturnRepositoryImpl(
    database: ref.read(appDatabaseProvider),
    remoteDataSource: ref.read(returnRemoteDataSourceProvider),
    networkInfo: ref.read(networkInfoProvider),
  );
});

class ReturnRepositoryImpl implements ReturnRepository {
  final AppDatabase database;
  final ReturnRemoteDataSource remoteDataSource;
  final NetworkInfo networkInfo;

  ReturnRepositoryImpl({
    required this.database,
    required this.remoteDataSource,
    required this.networkInfo,
  });

  Future<void> _pushPendingReturns() async {
    final pending = await database.returnDao.getUnsynced();
    for (final row in pending) {
      try {
        final items = await database.returnDao.getItems(row.id);
        await remoteDataSource.createReturn({
          'id': row.id,
          'returnNumber': row.returnNumber,
          'saleId': row.saleId,
          'type': row.type,
          'reason': row.reason,
          'total': row.total,
          'items': items.map((i) => {'productId': i.productId, 'quantity': i.quantity, 'price': i.price}).toList(),
        });
        await database.returnDao.markSynced([row.id]);
      } on DioException catch (e) {
        if (e.response?.statusCode == 400) {
          await database.returnDao.markSynced([row.id]);
          continue;
        }
        if (e.response?.statusCode == 404 || e.response?.statusCode == 501) MobileApiGate.disable('returns');
        break;
      } catch (_) {
        break;
      }
    }
  }

  @override
  Future<Either<Failure, Return>> createReturn(Return returnData) async {
    try {
      final returnId = returnData.id.isEmpty ? const Uuid().v4() : returnData.id;
      final companion = ReturnsTableCompanion(
        id: Value(returnId),
        tenantId: Value(returnData.tenantId),
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
      await database.returnDao.insertReturn(companion);
      for (final item in returnData.items) {
        await database.returnDao.insertReturnItem(
          ReturnItemsTableCompanion(
            id: Value(item.id.isEmpty ? const Uuid().v4() : item.id),
            returnId: Value(returnId),
            productId: Value(item.productId),
            quantity: Value(item.quantity),
            price: Value(item.price),
            subtotal: Value(item.subtotal),
            reason: Value(item.reason),
          ),
        );
      }
      return Right(returnData.copyWith(id: returnId));
    } catch (e) {
      return Left(DatabaseFailure(message: 'Gagal menyimpan retur: $e'));
    }
  }

  @override
  Future<Either<Failure, Return>> getReturn(String id) async {
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
      if (await networkInfo.isConnected && !MobileApiGate.isDisabled('returns')) {
        await _pushPendingReturns();
      }
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
      tenantId: r.tenantId,
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

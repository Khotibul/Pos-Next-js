import 'package:dartz/dartz.dart';
import 'package:drift/drift.dart' show Value;
import 'package:dio/dio.dart' show DioException;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';

import '../../core/errors/failures.dart';
import '../../core/network/mobile_api_gate.dart';
import '../../core/network/network_info.dart';
import '../../domain/entities/payable.dart';
import '../../domain/repositories/payable_repository.dart';
import '../datasources/local/database/app_database.dart';
import '../datasources/remote/payable_remote_datasource.dart';
import '../models/payable_model.dart';

final payableRepositoryProvider = Provider<PayableRepository>((ref) {
  return PayableRepositoryImpl(
    remoteDataSource: ref.read(payableRemoteDataSourceProvider),
    database: ref.read(appDatabaseProvider),
    networkInfo: ref.read(networkInfoProvider),
  );
});

class PayableRepositoryImpl implements PayableRepository {
  final PayableRemoteDataSource remoteDataSource;
  final AppDatabase database;
  final NetworkInfo networkInfo;

  PayableRepositoryImpl({
    required this.remoteDataSource,
    required this.database,
    required this.networkInfo,
  });

  @override
  Future<Either<Failure, Payable>> createPayable(Payable payable) async {
    try {
      await _savePayableLocally(payable);
    } catch (e) {
      return Left(DatabaseFailure(message: 'Gagal menyimpan utang: $e'));
    }
    if (await networkInfo.isConnected) {
      try {
        final payload = Map<String, dynamic>.from(PayableModel.fromEntity(payable).toJson());
        await remoteDataSource.createPayable(payload);
        await database.payableDao.markSynced([payable.id]);
      } catch (_) {}
    }
    return Right(payable);
  }

  @override
  Future<Either<Failure, void>> createPayment(PayablePayment payment) async {
    try {
      await database.payableDao.insertPayment(
        PayablePaymentsTableCompanion(
          id: Value(payment.id),
          tenantId: const Value(null),
          payableId: Value(payment.payableId),
          amount: Value(payment.amount),
          method: Value(payment.method),
          reference: Value(payment.reference),
          notes: Value(payment.notes),
          paidAt: Value(payment.paidAt),
        ),
      );
      final payable = await database.payableDao.getById(payment.payableId);
      if (payable != null) {
        final newPaid = payable.paidAmount + payment.amount;
        final newRemaining = (payable.totalAmount - newPaid).clamp(0, double.infinity);
        final newStatus = newPaid >= payable.totalAmount ? 'PAID' : newPaid > 0 ? 'PARTIAL' : 'UNPAID';
        await database.payableDao.upsertPayable(
          PayablesTableCompanion(
            id: Value(payable.id),
            paidAmount: Value(newPaid),
            remainingAmount: Value(newRemaining),
            status: Value(newStatus),
            isSynced: const Value(false),
          ),
        );
      }
    } catch (e) {
      return Left(DatabaseFailure(message: 'Gagal menyimpan pembayaran: $e'));
    }
    return const Right(null);
  }

  @override
  Future<Either<Failure, List<Payable>>> getPayables({
    int page = 1,
    int limit = 20,
    String? search,
    String? status,
  }) async {
    await _syncFromServer();
    try {
      final rows = await database.payableDao.getAll(search: search, status: status);
      final entities = rows.map(_toEntity).toList();
      final start = (page - 1) * limit;
      final paged = entities.skip(start).take(limit).toList();
      return Right(paged);
    } catch (e) {
      return Left(DatabaseFailure(message: 'Gagal mengambil data utang: $e'));
    }
  }

  @override
  Future<Either<Failure, Payable>> getPayable(String id) async {
    try {
      final row = await database.payableDao.getById(id);
      if (row == null) return Left(DatabaseFailure(message: 'Utang tidak ditemukan'));
      return Right(_toEntity(row));
    } catch (e) {
      return Left(DatabaseFailure(message: 'Gagal mengambil data utang: $e'));
    }
  }

  @override
  Future<Either<Failure, void>> deletePayable(String id) async {
    try {
      await database.payableDao.deletePayable(id);
      return const Right(null);
    } catch (e) {
      return Left(DatabaseFailure(message: 'Gagal menghapus utang: $e'));
    }
  }

  Future<void> _savePayableLocally(Payable payable) async {
    await database.payableDao.upsertPayable(
      PayablesTableCompanion(
        id: Value(payable.id),
        tenantId: const Value(null),
        supplierId: Value(payable.supplierId),
        purchaseOrderId: Value(payable.purchaseOrderId),
        invoiceNo: Value(payable.invoiceNo),
        description: Value(payable.description),
        totalAmount: Value(payable.totalAmount),
        paidAmount: Value(payable.paidAmount),
        remainingAmount: Value(payable.remainingAmount),
        dueDate: Value(payable.dueDate),
        status: Value(payable.status),
        notes: Value(payable.notes),
        isSynced: const Value(false),
      ),
    );
  }

  Future<void> _syncFromServer() async {
    if (!await networkInfo.isConnected) return;
    try {
      final unsynced = await database.payableDao.getUnsynced();
      for (final row in unsynced) {
        try {
          final entity = _toEntity(row);
          await remoteDataSource.createPayable(PayableModel.fromEntity(entity).toJson());
          await database.payableDao.markSynced([row.id]);
        } on DioException catch (e) {
          if (e.response?.statusCode == 400 || e.response?.statusCode == 404) {
            await database.payableDao.markSynced([row.id]);
          }
        } catch (_) {}
      }
      final unsyncedPayments = await database.payableDao.getUnsyncedPayments();
      for (final p in unsyncedPayments) {
        try {
          await remoteDataSource.createPayablePayment({
            'id': p.id,
            'payableId': p.payableId,
            'amount': p.amount,
            'method': p.method,
            'reference': p.reference,
            'notes': p.notes,
            'paidAt': p.paidAt.toIso8601String(),
          });
          await database.payableDao.markPaymentsSynced([p.id]);
        } on DioException catch (e) {
          if (e.response?.statusCode == 400 || e.response?.statusCode == 404) {
            await database.payableDao.markPaymentsSynced([p.id]);
          }
        } catch (_) {}
      }
      final remoteList = await remoteDataSource.getPayables(limit: 500);
      for (final model in remoteList) {
        await database.payableDao.upsertPayable(
          PayablesTableCompanion(
            id: Value(model.id),
            tenantId: const Value(null),
            supplierId: Value(model.supplierId),
            purchaseOrderId: Value(model.purchaseOrderId),
            invoiceNo: Value(model.invoiceNo),
            description: Value(model.description),
            totalAmount: Value(model.totalAmount),
            paidAmount: Value(model.paidAmount),
            remainingAmount: Value(model.remainingAmount),
            dueDate: Value(model.dueDate != null ? DateTime.tryParse(model.dueDate!) : null),
            status: Value(model.status),
            notes: Value(model.notes),
            isSynced: const Value(true),
          ),
        );
      }
    } catch (_) {}
  }

  Payable _toEntity(PayablesTableData row) {
    return Payable(
      id: row.id,
      supplierId: row.supplierId,
      purchaseOrderId: row.purchaseOrderId,
      invoiceNo: row.invoiceNo,
      description: row.description,
      totalAmount: row.totalAmount,
      paidAmount: row.paidAmount,
      remainingAmount: row.remainingAmount,
      dueDate: row.dueDate,
      status: row.status,
      notes: row.notes,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    );
  }
}

import 'package:dartz/dartz.dart';
import 'package:drift/drift.dart' show Value;
import 'package:dio/dio.dart' show DioException;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';

import '../../core/errors/failures.dart';
import '../../core/network/mobile_api_gate.dart';
import '../../core/network/network_info.dart';
import '../../domain/entities/receivable.dart';
import '../../domain/repositories/receivable_repository.dart';
import '../datasources/local/database/app_database.dart';
import '../datasources/remote/receivable_remote_datasource.dart';
import '../models/receivable_model.dart';

final receivableRepositoryProvider = Provider<ReceivableRepository>((ref) {
  return ReceivableRepositoryImpl(
    remoteDataSource: ref.read(receivableRemoteDataSourceProvider),
    database: ref.read(appDatabaseProvider),
    networkInfo: ref.read(networkInfoProvider),
  );
});

class ReceivableRepositoryImpl implements ReceivableRepository {
  final ReceivableRemoteDataSource remoteDataSource;
  final AppDatabase database;
  final NetworkInfo networkInfo;

  ReceivableRepositoryImpl({
    required this.remoteDataSource,
    required this.database,
    required this.networkInfo,
  });

  @override
  Future<Either<Failure, Receivable>> createReceivable(Receivable receivable) async {
    try {
      await _saveReceivableLocally(receivable);
    } catch (e) {
      return Left(DatabaseFailure(message: 'Gagal menyimpan piutang: $e'));
    }
    if (await networkInfo.isConnected) {
      try {
        final payload = Map<String, dynamic>.from(ReceivableModel.fromEntity(receivable).toJson());
        await remoteDataSource.createReceivable(payload);
        await database.receivableDao.markSynced([receivable.id]);
      } catch (_) {}
    }
    return Right(receivable);
  }

  @override
  Future<Either<Failure, void>> createPayment(ReceivablePayment payment) async {
    try {
      await database.receivableDao.insertPayment(
        ReceivablePaymentsTableCompanion(
          id: Value(payment.id),
          tenantId: const Value(null),
          receivableId: Value(payment.receivableId),
          amount: Value(payment.amount),
          method: Value(payment.method),
          reference: Value(payment.reference),
          notes: Value(payment.notes),
          paidAt: Value(payment.paidAt),
        ),
      );
      // Update parent receivable
      final receivable = await database.receivableDao.getById(payment.receivableId);
      if (receivable != null) {
        final newPaid = receivable.paidAmount + payment.amount;
        final newRemaining = (receivable.totalAmount - newPaid).clamp(0, double.infinity);
        final newStatus = newPaid >= receivable.totalAmount ? 'PAID' : newPaid > 0 ? 'PARTIAL' : 'UNPAID';
        await database.receivableDao.upsertReceivable(
          ReceivablesTableCompanion(
            id: Value(receivable.id),
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
  Future<Either<Failure, List<Receivable>>> getReceivables({
    int page = 1,
    int limit = 20,
    String? search,
    String? status,
  }) async {
    await _syncFromServer();
    try {
      final rows = await database.receivableDao.getAll(search: search, status: status);
      final entities = rows.map(_toEntity).toList();
      final start = (page - 1) * limit;
      final paged = entities.skip(start).take(limit).toList();
      return Right(paged);
    } catch (e) {
      return Left(DatabaseFailure(message: 'Gagal mengambil data piutang: $e'));
    }
  }

  @override
  Future<Either<Failure, Receivable>> getReceivable(String id) async {
    try {
      final row = await database.receivableDao.getById(id);
      if (row == null) return Left(DatabaseFailure(message: 'Piutang tidak ditemukan'));
      return Right(_toEntity(row));
    } catch (e) {
      return Left(DatabaseFailure(message: 'Gagal mengambil data piutang: $e'));
    }
  }

  @override
  Future<Either<Failure, void>> deleteReceivable(String id) async {
    try {
      await database.receivableDao.deleteReceivable(id);
      return const Right(null);
    } catch (e) {
      return Left(DatabaseFailure(message: 'Gagal menghapus piutang: $e'));
    }
  }

  Future<void> _saveReceivableLocally(Receivable receivable) async {
    await database.receivableDao.upsertReceivable(
      ReceivablesTableCompanion(
        id: Value(receivable.id),
        tenantId: const Value(null),
        customerId: Value(receivable.customerId),
        saleId: Value(receivable.saleId),
        invoiceNo: Value(receivable.invoiceNo),
        description: Value(receivable.description),
        totalAmount: Value(receivable.totalAmount),
        paidAmount: Value(receivable.paidAmount),
        remainingAmount: Value(receivable.remainingAmount),
        dueDate: Value(receivable.dueDate),
        status: Value(receivable.status),
        notes: Value(receivable.notes),
        isSynced: const Value(false),
      ),
    );
  }

  Future<void> _syncFromServer() async {
    if (!await networkInfo.isConnected) return;
    try {
      // Push pending
      final unsynced = await database.receivableDao.getUnsynced();
      for (final row in unsynced) {
        try {
          final entity = _toEntity(row);
          await remoteDataSource.createReceivable(ReceivableModel.fromEntity(entity).toJson());
          await database.receivableDao.markSynced([row.id]);
        } on DioException catch (e) {
          if (e.response?.statusCode == 400 || e.response?.statusCode == 404) {
            await database.receivableDao.markSynced([row.id]);
          }
        } catch (_) {}
      }
      // Push pending payments
      final unsyncedPayments = await database.receivableDao.getUnsyncedPayments();
      for (final p in unsyncedPayments) {
        try {
          await remoteDataSource.createReceivablePayment({
            'id': p.id,
            'receivableId': p.receivableId,
            'amount': p.amount,
            'method': p.method,
            'reference': p.reference,
            'notes': p.notes,
            'paidAt': p.paidAt.toIso8601String(),
          });
          await database.receivableDao.markPaymentsSynced([p.id]);
        } on DioException catch (e) {
          if (e.response?.statusCode == 400 || e.response?.statusCode == 404) {
            await database.receivableDao.markPaymentsSynced([p.id]);
          }
        } catch (_) {}
      }
      // Pull remote
      final remoteList = await remoteDataSource.getReceivables(limit: 500);
      for (final model in remoteList) {
        await database.receivableDao.upsertReceivable(
          ReceivablesTableCompanion(
            id: Value(model.id),
            tenantId: const Value(null),
            customerId: Value(model.customerId),
            saleId: Value(model.saleId),
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

  Receivable _toEntity(ReceivablesTableData row) {
    return Receivable(
      id: row.id,
      customerId: row.customerId,
      saleId: row.saleId,
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

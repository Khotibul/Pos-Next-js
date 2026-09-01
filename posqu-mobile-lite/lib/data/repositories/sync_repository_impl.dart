import 'dart:convert';
import 'package:dartz/dartz.dart';
import 'package:drift/drift.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/errors/failures.dart';
import '../../core/network/network_info.dart';
import '../../domain/entities/sync_queue_item.dart';
import '../../domain/repositories/sync_repository.dart';
import '../datasources/local/database/app_database.dart';
import '../datasources/remote/sync_remote_datasource.dart';

final syncRepositoryProvider = Provider<SyncRepository>((ref) {
  return SyncRepositoryImpl(
    remoteDataSource: ref.read(syncRemoteDataSourceProvider),
    database: ref.read(appDatabaseProvider),
    networkInfo: ref.read(networkInfoProvider),
  );
});

class SyncRepositoryImpl implements SyncRepository {
  final SyncRemoteDataSource remoteDataSource;
  final AppDatabase database;
  final NetworkInfo networkInfo;

  SyncRepositoryImpl({
    required this.remoteDataSource,
    required this.database,
    required this.networkInfo,
  });

  @override
  Future<Either<Failure, void>> addToQueue({
    required String tableName,
    required String action,
    required String recordId,
    Map<String, dynamic>? data,
  }) async {
    try {
      await database.syncQueueDao.insertSyncQueue(
        SyncQueueTableCompanion(
          action: Value(action),
          recordId: Value(recordId),
          data: Value(data != null ? jsonEncode(data) : '{}'),
          status: const Value('pending'),
        ),
      );
      return const Right(null);
    } catch (e) {
      return const Left(DatabaseFailure(message: 'Gagal menambahkan ke antrian sync'));
    }
  }

  @override
  Future<Either<Failure, SyncStatus>> getSyncStatus() async {
    try {
      final pendingCount = await database.syncQueueDao.getPendingCount();
      final failedCount = await database.syncQueueDao.getFailedCount();
      return Right(SyncStatus(
        pendingCount: pendingCount,
        failedCount: failedCount,
      ));
    } catch (e) {
      return const Right(SyncStatus());
    }
  }

  @override
  Future<Either<Failure, int>> syncAll() async {
    final isConnected = await networkInfo.isConnected;
    if (!isConnected) {
      return const Left(NetworkFailure(message: 'Tidak ada koneksi internet'));
    }

    try {
      final pendingCount = await database.syncQueueDao.getPendingCount();
      final result = await processQueue();
      // ignore: unawaited_return_in_try_block
      return result.fold(
        (l) => Left(l),
        (r) => Right(pendingCount),
      );
    } catch (e) {
      return Left(SyncFailure(message: 'Sinkronisasi gagal: $e'));
    }
  }

  @override
  Future<Either<Failure, bool>> processQueue() async {
    final isConnected = await networkInfo.isConnected;
    if (!isConnected) return const Right(false);

    try {
      final pending = await database.syncQueueDao.getPending();
      if (pending.isEmpty) return const Right(true);

      final batch = pending.map((item) {
        Map<String, dynamic> data = {};
        try {
          data = jsonDecode(item.data);
        } catch (_) {}
        return {
          'id': item.id,
          'action': item.action,
          'record_id': item.recordId,
          'data': data,
        };
      }).toList();

      final result = await remoteDataSource.sendBatch(batch);
      final syncedIds = List<int>.from(result['synced_ids'] ?? []);

      for (final id in syncedIds) {
        await database.syncQueueDao.updateStatus(id, 'completed');
      }

      final failedItems = List<Map<String, dynamic>>.from(result['failed'] ?? []);
      for (final failed in failedItems) {
        await database.syncQueueDao.updateStatus(
          failed['id'],
          'failed',
          errorMessage: failed['error'],
        );
      }

      return const Right(true);
    } catch (e) {
      return Left(SyncFailure(message: 'Gagal memproses antrian: $e'));
    }
  }

  @override
  Future<Either<Failure, void>> clearSynced() async {
    try {
      await database.syncQueueDao.deleteCompleted();
      return const Right(null);
    } catch (e) {
      return const Left(DatabaseFailure(message: 'Gagal membersihkan data sync'));
    }
  }
}

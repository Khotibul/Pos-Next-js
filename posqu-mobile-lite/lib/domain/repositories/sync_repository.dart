import 'package:dartz/dartz.dart' show Either;

import '../entities/sync_queue_item.dart';
import '../../core/errors/failures.dart';

abstract class SyncRepository {
  Future<Either<Failure, void>> addToQueue({
    required String tableName,
    required String action,
    required String recordId,
    Map<String, dynamic>? data,
  });
  Future<Either<Failure, SyncStatus>> getSyncStatus();
  Future<Either<Failure, int>> syncAll();
  Future<Either<Failure, bool>> processQueue();
  Future<Either<Failure, void>> clearSynced();
}

import 'package:drift/drift.dart';
import '../app_database.dart';
import '../tables/sync_queue_table.dart';

part 'sync_queue_dao.g.dart';

@DriftAccessor(tables: [SyncQueueTable])
class SyncQueueDao extends DatabaseAccessor<AppDatabase> with _$SyncQueueDaoMixin {
  SyncQueueDao(super.db);

  Future<List<SyncQueueTableData>> getPending() {
    return (select(syncQueueTable)
          ..where((t) => t.status.equals('pending'))
          ..orderBy([(t) => OrderingTerm(expression: t.createdAt)]))
        .get();
  }

  Future<List<SyncQueueTableData>> getFailed() {
    return (select(syncQueueTable)
          ..where((t) => t.status.equals('failed'))
          ..orderBy([(t) => OrderingTerm(expression: t.createdAt)]))
        .get();
  }

  Future<int> getPendingCount() {
    return (select(syncQueueTable)..where((t) => t.status.equals('pending')))
        .get()
        .then((rows) => rows.length);
  }

  Future<int> getFailedCount() {
    return (select(syncQueueTable)..where((t) => t.status.equals('failed')))
        .get()
        .then((rows) => rows.length);
  }

  Future<int> insertSyncQueue(SyncQueueTableCompanion item) {
    return into(syncQueueTable).insert(item);
  }

  Future<int> updateStatus(int id, String status, {String? errorMessage}) {
    return (update(syncQueueTable)..where((t) => t.id.equals(id))).write(
      SyncQueueTableCompanion(
        status: Value(status),
        errorMessage: errorMessage != null ? Value(errorMessage) : const Value.absent(),
        lastAttempt: Value(DateTime.now()),
      ),
    );
  }

  Future<int> deleteCompleted() {
    return (delete(syncQueueTable)..where((t) => t.status.equals('completed'))).go();
  }

  Future<int> clearAll() {
    return delete(syncQueueTable).go();
  }
}

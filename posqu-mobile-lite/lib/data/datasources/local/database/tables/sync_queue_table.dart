import 'package:drift/drift.dart';

class SyncQueueTable extends Table {
  IntColumn get id => integer().autoIncrement()();
  @override
  String? get tableName => 'sync_queue';
  TextColumn get action => text()();
  TextColumn get recordId => text()();
  TextColumn get data => text()();
  TextColumn get status => text()();
  IntColumn get retryCount => integer().withDefault(const Constant(0))();
  TextColumn get errorMessage => text().nullable()();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
  DateTimeColumn get lastAttempt => dateTime().nullable()();

  @override
  Set<Column> get primaryKey => {id};
}

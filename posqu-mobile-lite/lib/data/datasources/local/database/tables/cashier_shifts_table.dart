import 'package:drift/drift.dart';
import 'package:uuid/uuid.dart';

class CashierShiftsTable extends Table {
  TextColumn get id => text().clientDefault(() => const Uuid().v4())();
  TextColumn get tenantId => text().nullable()();
  TextColumn get branchId => text().nullable()();
  TextColumn get cashierId => text()();
  DateTimeColumn get openedAt => dateTime().withDefault(currentDateAndTime)();
  DateTimeColumn get closedAt => dateTime().nullable()();
  TextColumn get status => text().withDefault(const Constant('OPEN'))();
  RealColumn get openingCash => real().withDefault(const Constant(0))();
  RealColumn get cashSystem => real().withDefault(const Constant(0))();
  RealColumn get cashCounted => real().nullable()();
  RealColumn get cashDifference => real().withDefault(const Constant(0))();
  RealColumn get totalSales => real().withDefault(const Constant(0))();
  RealColumn get totalCash => real().withDefault(const Constant(0))();
  RealColumn get totalQris => real().withDefault(const Constant(0))();
  RealColumn get totalTransfer => real().withDefault(const Constant(0))();
  RealColumn get totalEwallet => real().withDefault(const Constant(0))();
  IntColumn get transactionCount => integer().withDefault(const Constant(0))();
  TextColumn get openNote => text().nullable()();
  TextColumn get closeNote => text().nullable()();
  TextColumn get approvedById => text().nullable()();
  DateTimeColumn get approvedAt => dateTime().nullable()();

  BoolColumn get isSynced => boolean().withDefault(const Constant(false))();

  RealColumn get closingBalance => real().withDefault(const Constant(0.0))();
  RealColumn get expectedBalance => real().withDefault(const Constant(0.0))();
  RealColumn get totalExpenses => real().withDefault(const Constant(0.0))();

  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
  DateTimeColumn get updatedAt => dateTime().withDefault(currentDateAndTime)();

  @override
  Set<Column> get primaryKey => {id};
}

class CashTransactionsTable extends Table {
  TextColumn get id => text().clientDefault(() => const Uuid().v4())();
  TextColumn get shiftId => text().nullable()();
  TextColumn get type => text()();
  TextColumn get category => text()();
  RealColumn get amount => real()();
  TextColumn get description => text().nullable()();
  TextColumn get referenceType => text().nullable()();
  TextColumn get referenceId => text().nullable()();
  DateTimeColumn get transactionDate => dateTime()();
  TextColumn get userId => text()();
  BoolColumn get isSynced => boolean().withDefault(const Constant(false))();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();

  @override
  Set<Column> get primaryKey => {id};
}

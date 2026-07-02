import 'package:drift/drift.dart';

class CashierShiftsTable extends Table {
  IntColumn get id => integer().autoIncrement()();
  IntColumn get userId => integer()();
  DateTimeColumn get openTime => dateTime()();
  DateTimeColumn get closeTime => dateTime().nullable()();
  TextColumn get status => text()();
  RealColumn get openingBalance => real()();
  RealColumn get closingBalance => real().withDefault(const Constant(0.0))();
  RealColumn get expectedBalance => real().withDefault(const Constant(0.0))();
  RealColumn get difference => real().withDefault(const Constant(0.0))();
  RealColumn get totalSales => real().withDefault(const Constant(0.0))();
  RealColumn get totalCash => real().withDefault(const Constant(0.0))();
  RealColumn get totalQris => real().withDefault(const Constant(0.0))();
  RealColumn get totalTransfer => real().withDefault(const Constant(0.0))();
  RealColumn get totalExpenses => real().withDefault(const Constant(0.0))();
  TextColumn get notes => text().nullable()();
  BoolColumn get isSynced => boolean().withDefault(const Constant(false))();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();

  @override
  Set<Column> get primaryKey => {id};
}

class CashTransactionsTable extends Table {
  IntColumn get id => integer().autoIncrement()();
  IntColumn get shiftId => integer().nullable()();
  TextColumn get type => text()();
  TextColumn get category => text()();
  RealColumn get amount => real()();
  TextColumn get description => text().nullable()();
  TextColumn get referenceType => text().nullable()();
  IntColumn get referenceId => integer().nullable()();
  DateTimeColumn get transactionDate => dateTime()();
  IntColumn get userId => integer()();
  BoolColumn get isSynced => boolean().withDefault(const Constant(false))();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();

  @override
  Set<Column> get primaryKey => {id};
}

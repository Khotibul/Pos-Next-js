import 'package:drift/drift.dart';

class ReturnsTable extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get returnNumber => text().unique()();
  IntColumn get saleId => integer().nullable()();
  IntColumn get purchaseId => integer().nullable()();
  TextColumn get type => text()();
  IntColumn get userId => integer()();
  IntColumn get customerId => integer().nullable()();
  IntColumn get supplierId => integer().nullable()();
  DateTimeColumn get returnDate => dateTime()();
  TextColumn get reason => text()();
  TextColumn get status => text()();
  RealColumn get total => real()();
  TextColumn get notes => text().nullable()();
  BoolColumn get isSynced => boolean().withDefault(const Constant(false))();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
  DateTimeColumn get updatedAt => dateTime().withDefault(currentDateAndTime)();

  @override
  Set<Column> get primaryKey => {id};
}

class ReturnItemsTable extends Table {
  IntColumn get id => integer().autoIncrement()();
  IntColumn get returnId => integer()();
  IntColumn get productId => integer()();
  RealColumn get quantity => real()();
  RealColumn get price => real()();
  RealColumn get subtotal => real()();
  TextColumn get reason => text()();

  @override
  Set<Column> get primaryKey => {id};

  @override
  List<String> get customConstraints => [
        'FOREIGN KEY (returnId) REFERENCES returns(id) ON DELETE CASCADE',
      ];
}

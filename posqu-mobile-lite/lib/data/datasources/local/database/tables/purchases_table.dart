import 'package:drift/drift.dart';

class PurchasesTable extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get invoiceNumber => text().unique()();
  IntColumn get supplierId => integer()();
  IntColumn get userId => integer()();
  DateTimeColumn get purchaseDate => dateTime()();
  TextColumn get status => text()();
  RealColumn get subtotal => real()();
  RealColumn get discount => real().withDefault(const Constant(0.0))();
  RealColumn get tax => real().withDefault(const Constant(0.0))();
  RealColumn get total => real()();
  TextColumn get notes => text().nullable()();
  BoolColumn get isSynced => boolean().withDefault(const Constant(false))();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
  DateTimeColumn get updatedAt => dateTime().withDefault(currentDateAndTime)();

  @override
  Set<Column> get primaryKey => {id};
}

class PurchaseItemsTable extends Table {
  IntColumn get id => integer().autoIncrement()();
  IntColumn get purchaseId => integer()();
  IntColumn get productId => integer()();
  RealColumn get quantity => real()();
  RealColumn get purchasePrice => real()();
  RealColumn get subtotal => real()();

  @override
  Set<Column> get primaryKey => {id};

  @override
  List<String> get customConstraints => [
        'FOREIGN KEY (purchaseId) REFERENCES purchases(id) ON DELETE CASCADE',
      ];
}

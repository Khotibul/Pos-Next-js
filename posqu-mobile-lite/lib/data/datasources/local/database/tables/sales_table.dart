import 'package:drift/drift.dart';

class SalesTable extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get invoiceNumber => text().unique()();
  IntColumn get customerId => integer().nullable()();
  IntColumn get userId => integer()();
  DateTimeColumn get saleDate => dateTime()();
  TextColumn get status => text()();
  TextColumn get paymentMethod => text()();
  TextColumn get paymentReference => text().nullable()();
  RealColumn get subtotal => real()();
  RealColumn get discount => real().withDefault(const Constant(0.0))();
  RealColumn get tax => real().withDefault(const Constant(0.0))();
  RealColumn get total => real()();
  RealColumn get paidAmount => real()();
  RealColumn get changeAmount => real().withDefault(const Constant(0.0))();
  TextColumn get notes => text().nullable()();
  BoolColumn get isSynced => boolean().withDefault(const Constant(false))();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
  DateTimeColumn get updatedAt => dateTime().withDefault(currentDateAndTime)();

  @override
  Set<Column> get primaryKey => {id};
}

class SaleItemsTable extends Table {
  IntColumn get id => integer().autoIncrement()();
  IntColumn get saleId => integer()();
  IntColumn get productId => integer()();
  RealColumn get quantity => real()();
  RealColumn get sellingPrice => real()();
  RealColumn get discount => real().withDefault(const Constant(0.0))();
  RealColumn get subtotal => real()();

  @override
  Set<Column> get primaryKey => {id};

  @override
  List<String> get customConstraints => [
        'FOREIGN KEY (saleId) REFERENCES sales(id) ON DELETE CASCADE',
      ];
}

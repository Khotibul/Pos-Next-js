import 'package:drift/drift.dart';
import 'package:uuid/uuid.dart';

class ReturnsTable extends Table {
  TextColumn get id => text().clientDefault(() => const Uuid().v4())();
  TextColumn get tenantId => text().nullable()();
  TextColumn get returnNumber => text().unique()();
  TextColumn get saleId => text().nullable()();
  TextColumn get purchaseId => text().nullable()();
  TextColumn get type => text()();
  TextColumn get userId => text()();
  TextColumn get customerId => text().nullable()();
  TextColumn get supplierId => text().nullable()();
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
  TextColumn get id => text().clientDefault(() => const Uuid().v4())();
  TextColumn get returnId => text()();
  TextColumn get productId => text()();
  RealColumn get quantity => real()();
  RealColumn get price => real()();
  RealColumn get subtotal => real()();
  TextColumn get reason => text()();

  @override
  Set<Column> get primaryKey => {id};

  @override
  List<String> get customConstraints => [
        'FOREIGN KEY (return_id) REFERENCES returns_table(id) ON DELETE CASCADE',
      ];
}

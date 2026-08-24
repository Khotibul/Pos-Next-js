import 'package:drift/drift.dart';
import 'package:uuid/uuid.dart';

class SalesTable extends Table {
  TextColumn get id => text().clientDefault(() => const Uuid().v4())();
  TextColumn get tenantId => text().nullable()();
  TextColumn get invoiceNo => text().unique()();
  TextColumn get cashierId => text().nullable()();
  TextColumn get shiftId => text().nullable()();
  TextColumn get customerId => text().nullable()();
  TextColumn get status => text().withDefault(const Constant('PAID'))();
  RealColumn get subtotal => real().withDefault(const Constant(0))();
  RealColumn get tax => real().withDefault(const Constant(0))();
  RealColumn get discount => real().withDefault(const Constant(0))();
  RealColumn get total => real().withDefault(const Constant(0))();
  TextColumn get notes => text().nullable()();
  BoolColumn get isSynced => boolean().withDefault(const Constant(false))();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
  DateTimeColumn get updatedAt => dateTime().withDefault(currentDateAndTime)();

  @override
  Set<Column> get primaryKey => {id};
}

class SaleItemsTable extends Table {
  TextColumn get id => text().clientDefault(() => const Uuid().v4())();
  TextColumn get saleId => text()();
  TextColumn get productId => text()();
  TextColumn get name => text().withDefault(const Constant(''))();
  TextColumn get sku => text().withDefault(const Constant(''))();
  RealColumn get price => real().withDefault(const Constant(0))();
  RealColumn get qty => real().withDefault(const Constant(1))();
  RealColumn get lineTotal => real().withDefault(const Constant(0))();

  @override
  Set<Column> get primaryKey => {id};

  @override
  List<String> get customConstraints => [
        'FOREIGN KEY (sale_id) REFERENCES sales_table(id) ON DELETE CASCADE',
      ];
}

class PaymentsTable extends Table {
  TextColumn get id => text().clientDefault(() => const Uuid().v4())();
  TextColumn get tenantId => text().nullable()();
  TextColumn get saleId => text()();
  TextColumn get method => text()();
  RealColumn get amount => real().withDefault(const Constant(0))();
  RealColumn get receivedAmount => real().withDefault(const Constant(0))();
  RealColumn get changeAmount => real().withDefault(const Constant(0))();
  TextColumn get reference => text().nullable()();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();

  @override
  Set<Column> get primaryKey => {id};

  @override
  List<String> get customConstraints => [
        'FOREIGN KEY (sale_id) REFERENCES sales_table(id) ON DELETE CASCADE',
      ];
}

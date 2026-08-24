import 'package:drift/drift.dart';
import 'package:uuid/uuid.dart';

class PurchasesTable extends Table {
  TextColumn get id => text().clientDefault(() => const Uuid().v4())();
  TextColumn get tenantId => text().nullable()();
  TextColumn get orderNo => text().unique()();
  TextColumn get supplierId => text().nullable()();
  TextColumn get status => text().withDefault(const Constant('DRAFT'))();
  TextColumn get notes => text().nullable()();
  RealColumn get subtotal => real().withDefault(const Constant(0))();
  RealColumn get tax => real().withDefault(const Constant(0))();
  RealColumn get total => real().withDefault(const Constant(0))();
  BoolColumn get isSynced => boolean().withDefault(const Constant(false))();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
  DateTimeColumn get updatedAt => dateTime().withDefault(currentDateAndTime)();

  @override
  Set<Column> get primaryKey => {id};
}

class PurchaseItemsTable extends Table {
  TextColumn get id => text().clientDefault(() => const Uuid().v4())();
  TextColumn get purchaseOrderId => text()();
  TextColumn get productId => text()();
  TextColumn get name => text().withDefault(const Constant(''))();
  TextColumn get sku => text().withDefault(const Constant(''))();
  RealColumn get costPrice => real().withDefault(const Constant(0))();
  RealColumn get qty => real().withDefault(const Constant(1))();
  RealColumn get lineTotal => real().withDefault(const Constant(0))();

  @override
  Set<Column> get primaryKey => {id};

  @override
  List<String> get customConstraints => [
        'FOREIGN KEY (purchase_order_id) REFERENCES purchases_table(id) ON DELETE CASCADE',
      ];
}

import 'package:drift/drift.dart';
import 'package:uuid/uuid.dart';

class ProductsTable extends Table {
  TextColumn get id => text().clientDefault(() => const Uuid().v4())();
  TextColumn get tenantId => text().nullable()();
  TextColumn get sku => text().unique()();
  TextColumn get slug => text().nullable()();
  TextColumn get name => text()();
  TextColumn get description => text().nullable()();
  TextColumn get barcode => text().nullable()();
  TextColumn get qrCode => text().nullable()();
  TextColumn get categoryId => text().nullable()();
  TextColumn get brandId => text().nullable()();
  TextColumn get supplierId => text().nullable()();
  TextColumn get unitId => text().nullable()();

  RealColumn get costPrice => real().withDefault(const Constant(0))();
  RealColumn get sellingPrice => real().withDefault(const Constant(0))();
  RealColumn get marginPct => real().withDefault(const Constant(0))();
  RealColumn get taxRate => real().withDefault(const Constant(0))();
  RealColumn get weight => real().withDefault(const Constant(0))();
  RealColumn get volume => real().withDefault(const Constant(0))();
  RealColumn get minStock => real().withDefault(const Constant(0))();
  RealColumn get reorderPoint => real().withDefault(const Constant(0))();
  RealColumn get wholesalePrice => real().withDefault(const Constant(0))();
  RealColumn get wholesaleDiscountPercent =>
      real().withDefault(const Constant(0))();
  IntColumn get wholesaleMinQty => integer().withDefault(const Constant(0))();

  BoolColumn get isActive => boolean().withDefault(const Constant(true))();
  BoolColumn get isFeatured => boolean().withDefault(const Constant(false))();
  BoolColumn get isConsignment =>
      boolean().withDefault(const Constant(false))();
  TextColumn get type => text().withDefault(const Constant('SINGLE'))();

  IntColumn get stock => integer().withDefault(const Constant(0))();

  BoolColumn get isSynced => boolean().withDefault(const Constant(true))();
  TextColumn get unit => text().withDefault(const Constant('pcs'))();
  TextColumn get imageUrl => text().nullable()();

  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
  DateTimeColumn get updatedAt => dateTime().withDefault(currentDateAndTime)();

  @override
  Set<Column> get primaryKey => {id};

  @override
  List<String> get customConstraints => [
        'FOREIGN KEY (category_id) REFERENCES categories_table(id) ON DELETE SET NULL',
      ];
}

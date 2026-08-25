import 'package:drift/drift.dart';
import 'package:uuid/uuid.dart';

class CustomersTable extends Table {
  TextColumn get id => text().clientDefault(() => const Uuid().v4())();
  TextColumn get tenantId => text().nullable()();
  TextColumn get name => text()();
  TextColumn get email => text().nullable()();
  TextColumn get phone => text().nullable()();
  TextColumn get address => text().nullable()();
  BoolColumn get isActive => boolean().withDefault(const Constant(true))();

  TextColumn get city => text().nullable()();
  RealColumn get totalPurchase => real().withDefault(const Constant(0.0))();
  IntColumn get purchaseCount => integer().withDefault(const Constant(0))();
  RealColumn get points => real().withDefault(const Constant(0.0))();

  BoolColumn get isSynced => boolean().withDefault(const Constant(true))();

  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
  DateTimeColumn get updatedAt => dateTime().withDefault(currentDateAndTime)();

  @override
  Set<Column> get primaryKey => {id};
}

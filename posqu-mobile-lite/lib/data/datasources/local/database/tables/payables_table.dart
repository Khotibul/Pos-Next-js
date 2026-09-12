import 'package:drift/drift.dart';
import 'package:uuid/uuid.dart';

class PayablesTable extends Table {
  TextColumn get id => text().clientDefault(() => const Uuid().v4())();
  TextColumn get tenantId => text().nullable()();
  TextColumn get supplierId => text().nullable()();
  TextColumn get purchaseOrderId => text().nullable()();
  TextColumn get invoiceNo => text()();
  TextColumn get description => text().nullable()();
  RealColumn get totalAmount => real().withDefault(const Constant(0.0))();
  RealColumn get paidAmount => real().withDefault(const Constant(0.0))();
  RealColumn get remainingAmount => real().withDefault(const Constant(0.0))();
  TextColumn get status => text().withDefault(const Constant('UNPAID'))();
  DateTimeColumn get dueDate => dateTime().nullable()();
  TextColumn get notes => text().nullable()();
  BoolColumn get isSynced => boolean().withDefault(const Constant(false))();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
  DateTimeColumn get updatedAt => dateTime().withDefault(currentDateAndTime)();

  @override
  Set<Column> get primaryKey => {id};
}

class PayablePaymentsTable extends Table {
  TextColumn get id => text().clientDefault(() => const Uuid().v4())();
  TextColumn get tenantId => text().nullable()();
  TextColumn get payableId => text()();
  RealColumn get amount => real().withDefault(const Constant(0.0))();
  TextColumn get method => text().withDefault(const Constant('CASH'))();
  TextColumn get reference => text().nullable()();
  TextColumn get notes => text().nullable()();
  DateTimeColumn get paidAt => dateTime().withDefault(currentDateAndTime)();
  BoolColumn get isSynced => boolean().withDefault(const Constant(false))();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();

  @override
  Set<Column> get primaryKey => {id};
}

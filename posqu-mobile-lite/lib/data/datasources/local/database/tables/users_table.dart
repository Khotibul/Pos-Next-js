import 'package:drift/drift.dart';
import 'package:uuid/uuid.dart';

class UsersTable extends Table {
  TextColumn get id => text().clientDefault(() => const Uuid().v4())();
  TextColumn get name => text().nullable()();
  TextColumn get email => text().unique().nullable()();
  TextColumn get phone => text().nullable()();
  DateTimeColumn get emailVerified => dateTime().nullable()();
  TextColumn get image => text().nullable()();
  TextColumn get passwordHash => text().nullable()();
  BoolColumn get isSuperAdmin => boolean().withDefault(const Constant(false))();
  BoolColumn get isActive => boolean().withDefault(const Constant(true))();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
  DateTimeColumn get updatedAt => dateTime().withDefault(currentDateAndTime)();

  @override
  Set<Column> get primaryKey => {id};
}

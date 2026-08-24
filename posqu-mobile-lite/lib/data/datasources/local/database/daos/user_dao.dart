import 'package:drift/drift.dart';
import '../app_database.dart';
import '../tables/users_table.dart';

part 'user_dao.g.dart';

@DriftAccessor(tables: [UsersTable])
class UserDao extends DatabaseAccessor<AppDatabase> with _$UserDaoMixin {
  UserDao(super.db);

  Future<UsersTableData?> getByEmail(String email) {
    return (select(usersTable)..where((t) => t.email.equals(email)))
        .getSingleOrNull();
  }

  Future<UsersTableData?> getById(String id) {
    return (select(usersTable)..where((t) => t.id.equals(id))).getSingleOrNull();
  }

  Future<void> insertUser(UsersTableCompanion user) async {
    await into(usersTable).insert(user);
  }

  Future<bool> updateUser(UsersTableCompanion user) {
    return update(usersTable).replace(user);
  }
}

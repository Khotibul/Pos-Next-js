import 'package:drift/drift.dart';
import '../app_database.dart';
import '../tables/users_table.dart';

part 'user_dao.g.dart';

@DriftAccessor(tables: [UsersTable])
class UserDao extends DatabaseAccessor<AppDatabase> with _$UserDaoMixin {
  UserDao(super.db);

  Future<UsersTableData?> getByUsername(String username) {
    return (select(usersTable)..where((t) => t.username.equals(username)))
        .getSingleOrNull();
  }

  Future<UsersTableData?> getById(int id) {
    return (select(usersTable)..where((t) => t.id.equals(id))).getSingleOrNull();
  }

  Future<int> insertUser(UsersTableCompanion user) {
    return into(usersTable).insert(user);
  }

  Future<bool> updateUser(UsersTableCompanion user) {
    return update(usersTable).replace(user);
  }
}

import 'package:drift/drift.dart';
import '../app_database.dart';
import '../tables/customers_table.dart';

part 'customer_dao.g.dart';

@DriftAccessor(tables: [CustomersTable])
class CustomerDao extends DatabaseAccessor<AppDatabase> with _$CustomerDaoMixin {
  CustomerDao(super.db);

  Future<List<CustomersTableData>> getAll({bool? activeOnly, String? search}) {
    return (select(customersTable)
          ..orderBy([(t) => OrderingTerm(expression: t.name)])
          ..where((t) {
            final exprs = <Expression<bool>>[];
            if (activeOnly == true) {
              exprs.add(t.isActive.equals(true));
            }
            if (search != null && search.isNotEmpty) {
              exprs.add(
                t.name.like('%$search%') | t.phone.like('%$search%'),
              );
            }
            if (exprs.isNotEmpty) {
              return exprs.reduce((a, b) => a & b);
            }
            return const Constant(true);
          }))
        .get();
  }

  Future<CustomersTableData?> getById(String id) {
    return (select(customersTable)..where((t) => t.id.equals(id))).getSingleOrNull();
  }

  Future<void> insertCustomer(CustomersTableCompanion customer) async {
    await into(customersTable).insert(customer);
  }

  Future<void> upsertCustomer(CustomersTableCompanion customer) async {
    await into(customersTable).insertOnConflictUpdate(customer);
  }  Future<bool> updateCustomer(CustomersTableCompanion customer) {
    return update(customersTable).replace(customer);
  }

  Future<int> deleteCustomer(String id) {
    return (delete(customersTable)..where((t) => t.id.equals(id))).go();
  }
}

import 'package:drift/drift.dart';
import '../app_database.dart';
import '../tables/suppliers_table.dart';

part 'supplier_dao.g.dart';

@DriftAccessor(tables: [SuppliersTable])
class SupplierDao extends DatabaseAccessor<AppDatabase> with _$SupplierDaoMixin {
  SupplierDao(super.db);

  Future<List<SuppliersTableData>> getAll({bool? activeOnly, String? search}) {
    return (select(suppliersTable)
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

  Future<SuppliersTableData?> getById(String id) {
    return (select(suppliersTable)..where((t) => t.id.equals(id))).getSingleOrNull();
  }

  Future<void> insertSupplier(SuppliersTableCompanion supplier) async {
    await into(suppliersTable).insert(supplier);
  }

  Future<List<SuppliersTableData>> getUnsynced() {
    return (select(suppliersTable)..where((t) => t.isSynced.equals(false))).get();
  }

  Future<void> markSynced(List<String> ids) {
    return (update(suppliersTable)..where((t) => t.id.isIn(ids)))
        .write(const SuppliersTableCompanion(isSynced: Value(true)));
  }

    Future<void> upsertSupplier(SuppliersTableCompanion supplier) async {
    await into(suppliersTable).insertOnConflictUpdate(supplier);
  }  Future<bool> updateSupplier(SuppliersTableCompanion supplier) {
    return update(suppliersTable).replace(supplier);
  }

  Future<int> deleteSupplier(String id) {
    return (delete(suppliersTable)..where((t) => t.id.equals(id))).go();
  }
}

import 'package:drift/drift.dart';
import '../app_database.dart';
import '../tables/categories_table.dart';

part 'category_dao.g.dart';

@DriftAccessor(tables: [CategoriesTable])
class CategoryDao extends DatabaseAccessor<AppDatabase> with _$CategoryDaoMixin {
  CategoryDao(super.db);

  Future<List<CategoriesTableData>> getAll({bool? activeOnly}) {
    return (select(categoriesTable)
          ..orderBy([(t) => OrderingTerm(expression: t.name)])
          ..where((t) {
            if (activeOnly == true) {
              return t.isActive.equals(true);
            }
            return const Constant(true);
          }))
        .get();
  }

  Future<CategoriesTableData?> getById(String id) {
    return (select(categoriesTable)..where((t) => t.id.equals(id))).getSingleOrNull();
  }

  Future<void> insertCategory(CategoriesTableCompanion category) async {
    await into(categoriesTable).insert(category);
  }

  Future<List<CategoriesTableData>> getUnsynced() {
    return (select(categoriesTable)..where((t) => t.isSynced.equals(false))).get();
  }

  Future<void> markSynced(List<String> ids) {
    return (update(categoriesTable)..where((t) => t.id.isIn(ids)))
        .write(const CategoriesTableCompanion(isSynced: Value(true)));
  }

    Future<void> upsertCategory(CategoriesTableCompanion category) async {
    await into(categoriesTable).insertOnConflictUpdate(category);
  }  Future<bool> updateCategory(CategoriesTableCompanion category) {
    return update(categoriesTable).replace(category);
  }

  Future<int> deleteCategory(String id) {
    return (delete(categoriesTable)..where((t) => t.id.equals(id))).go();
  }
}

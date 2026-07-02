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

  Future<CategoriesTableData?> getById(int id) {
    return (select(categoriesTable)..where((t) => t.id.equals(id))).getSingleOrNull();
  }

  Future<int> insertCategory(CategoriesTableCompanion category) {
    return into(categoriesTable).insert(category);
  }

  Future<bool> updateCategory(CategoriesTableCompanion category) {
    return update(categoriesTable).replace(category);
  }

  Future<int> deleteCategory(int id) {
    return (delete(categoriesTable)..where((t) => t.id.equals(id))).go();
  }
}

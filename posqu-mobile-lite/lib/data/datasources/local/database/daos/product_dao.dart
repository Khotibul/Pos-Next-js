import 'package:drift/drift.dart';
import '../app_database.dart';
import '../tables/products_table.dart';

part 'product_dao.g.dart';

@DriftAccessor(tables: [ProductsTable])
class ProductDao extends DatabaseAccessor<AppDatabase> with _$ProductDaoMixin {
  ProductDao(super.db);

  Future<List<ProductsTableData>> getAll({String? search, String? categoryId}) {
    return (select(productsTable)
          ..orderBy([(t) => OrderingTerm(expression: t.name)])
          ..where((t) {
            final exprs = <Expression<bool>>[];
            if (search != null && search.isNotEmpty) {
              exprs.add(
                t.name.like('%$search%') |
                    t.sku.like('%$search%') |
                    t.barcode.like('%$search%'),
              );
            }
            if (categoryId != null && categoryId.isNotEmpty) {
              exprs.add(t.categoryId.equals(categoryId));
            }
            if (exprs.isNotEmpty) {
              return exprs.reduce((a, b) => a & b);
            }
            return const Constant(true);
          }))
        .get();
  }

  Future<ProductsTableData?> getById(String id) {
    return (select(productsTable)..where((t) => t.id.equals(id))).getSingleOrNull();
  }

  Future<ProductsTableData?> getByBarcode(String barcode) {
    return (select(productsTable)..where((t) => t.barcode.equals(barcode)))
        .getSingleOrNull();
  }

  Future<ProductsTableData?> getBySku(String sku) {
    return (select(productsTable)..where((t) => t.sku.equals(sku)))
        .getSingleOrNull();
  }

  Future<void> insertProduct(ProductsTableCompanion product) async {
    await into(productsTable).insert(product);
  }

  Future<void> upsertProduct(ProductsTableCompanion product) async {
    await into(productsTable).insertOnConflictUpdate(product);
  }  Future<bool> updateProduct(ProductsTableCompanion product) {
    return update(productsTable).replace(product);
  }

  Future<int> deleteProduct(String id) {
    return (delete(productsTable)..where((t) => t.id.equals(id))).go();
  }

  Future<List<ProductsTableData>> search(String query) {
    return (select(productsTable)
          ..where((t) =>
              t.name.like('%$query%') |
              t.sku.like('%$query%') |
              t.barcode.like('%$query%'))
          ..orderBy([(t) => OrderingTerm(expression: t.name)])
          ..limit(20))
        .get();
  }

  Future<List<ProductsTableData>> getLowStock() async {
    final rows = await (select(productsTable)
          ..orderBy([(t) => OrderingTerm(expression: t.stock)]))
        .get();
    return rows.where((r) => r.stock <= r.minStock).take(50).toList();
  }

  Future<int> updateStock(String id, int quantity) {
    return (update(productsTable)..where((t) => t.id.equals(id)))
        .write(ProductsTableCompanion(stock: Value(quantity)));
  }

  Future<List<ProductsTableData>> getUnsynced() {
    return (select(productsTable)..where((t) => t.isSynced.equals(false))).get();
  }

  Future<void> markSynced(List<String> ids) {
    return (update(productsTable)..where((t) => t.id.isIn(ids)))
        .write(const ProductsTableCompanion(isSynced: Value(true)));
  }

    Future<int> getCount() {
    return select(productsTable).get().then((rows) => rows.length);
  }
}

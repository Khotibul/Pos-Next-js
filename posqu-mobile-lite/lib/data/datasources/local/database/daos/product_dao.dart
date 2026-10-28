import 'package:drift/drift.dart';
import '../app_database.dart';
import '../tables/products_table.dart';

part 'product_dao.g.dart';

@DriftAccessor(tables: [ProductsTable])
class ProductDao extends DatabaseAccessor<AppDatabase> with _$ProductDaoMixin {
  ProductDao(super.db);

  Future<List<ProductsTableData>> getAll({String? search, String? categoryId}) {
    final q = search?.trim().toLowerCase();
    return (select(productsTable)
          ..orderBy([(t) => OrderingTerm(expression: t.name)])
          ..where((t) {
            final exprs = <Expression<bool>>[];
            if (q != null && q.isNotEmpty) {
              final lowerName = t.name.lower();
              final lowerSku = t.sku.lower();
              final lowerBarcode = t.barcode.lower();
              exprs.add(
                lowerName.like('%$q%') |
                    lowerSku.like('%$q%') |
                    lowerBarcode.like('%$q%'),
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
  }

  /// Simpan banyak produk dalam satu batch (jauh lebih cepat untuk ribuan data).
  Future<void> upsertProducts(List<ProductsTableCompanion> products) async {
    if (products.isEmpty) return;
    await batch((b) {
      b.insertAllOnConflictUpdate(productsTable, products);
    });
  }
  Future<bool> updateProduct(ProductsTableCompanion product) {
    return update(productsTable).replace(product);
  }

  Future<int> deleteProduct(String id) {
    return (delete(productsTable)..where((t) => t.id.equals(id))).go();
  }

  Future<List<ProductsTableData>> search(String query) async {
    final q = query.trim().toLowerCase();
    if (q.isEmpty) return <ProductsTableData>[];
    final rows = await (select(productsTable)
          ..where((t) =>
              t.name.lower().like('%$q%') |
              t.sku.lower().like('%$q%') |
              t.barcode.lower().like('%$q%'))
          ..orderBy([(t) => OrderingTerm(expression: t.name)])
          ..limit(50))
        .get();
    return rows;
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

    Future<int> getCount() async {
    final count = productsTable.id.count();
    final row = await (selectOnly(productsTable)..addColumns([count])).getSingle();
    return row.read(count) ?? 0;
  }
}

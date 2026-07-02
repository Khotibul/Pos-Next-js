import 'package:drift/drift.dart';
import '../app_database.dart';
import '../tables/products_table.dart';

part 'product_dao.g.dart';

@DriftAccessor(tables: [ProductsTable])
class ProductDao extends DatabaseAccessor<AppDatabase> with _$ProductDaoMixin {
  ProductDao(super.db);

  Future<List<ProductsTableData>> getAll({String? search, int? categoryId}) {
    return (select(productsTable)
          ..orderBy([(t) => OrderingTerm(expression: t.name)])
          ..where((t) {
            final exprs = <Expression<bool>>[];
            if (search != null && search.isNotEmpty) {
              exprs.add(
                t.name.like('%$search%') |
                    t.code.like('%$search%') |
                    t.barcode.like('%$search%'),
              );
            }
            if (categoryId != null) {
              exprs.add(t.categoryId.equals(categoryId));
            }
            if (exprs.isNotEmpty) {
              return exprs.reduce((a, b) => a & b);
            }
            return const Constant(true);
          }))
        .get();
  }

  Future<ProductsTableData?> getById(int id) {
    return (select(productsTable)..where((t) => t.id.equals(id))).getSingleOrNull();
  }

  Future<ProductsTableData?> getByBarcode(String barcode) {
    return (select(productsTable)..where((t) => t.barcode.equals(barcode)))
        .getSingleOrNull();
  }

  Future<ProductsTableData?> getByCode(String code) {
    return (select(productsTable)..where((t) => t.code.equals(code)))
        .getSingleOrNull();
  }

  Future<int> insertProduct(ProductsTableCompanion product) {
    return into(productsTable).insert(product);
  }

  Future<bool> updateProduct(ProductsTableCompanion product) {
    return update(productsTable).replace(product);
  }

  Future<int> deleteProduct(int id) {
    return (delete(productsTable)..where((t) => t.id.equals(id))).go();
  }

  Future<List<ProductsTableData>> search(String query) {
    return (select(productsTable)
          ..where((t) =>
              t.name.like('%$query%') |
              t.code.like('%$query%') |
              t.barcode.like('%$query%'))
          ..orderBy([(t) => OrderingTerm(expression: t.name)])
          ..limit(20))
        .get();
  }

  Future<List<ProductsTableData>> getLowStock() {
    return (select(productsTable)
          ..where((t) => t.stock.isNotNull() & t.minStock.isNotNull())
          ..orderBy([(t) => OrderingTerm(expression: t.stock)])
          ..limit(50))
        .get();
  }

  Future<int> updateStock(int id, int quantity) {
    return (update(productsTable)..where((t) => t.id.equals(id)))
        .write(ProductsTableCompanion(stock: Value(quantity)));
  }

  Future<int> getCount() {
    return select(productsTable).get().then((rows) => rows.length);
  }
}

import 'package:drift/drift.dart';
import '../app_database.dart';
import '../tables/sales_table.dart';

part 'sale_dao.g.dart';

@DriftAccessor(tables: [SalesTable, SaleItemsTable])
class SaleDao extends DatabaseAccessor<AppDatabase> with _$SaleDaoMixin {
  SaleDao(super.db);

  Future<List<SalesTableData>> getAll({
    String? search,
    DateTime? startDate,
    DateTime? endDate,
    String? paymentMethod,
  }) {
    return (select(salesTable)
          ..orderBy([(t) => OrderingTerm(expression: t.saleDate, mode: OrderingMode.desc)])
          ..where((t) {
            final exprs = <Expression<bool>>[];
            if (search != null && search.isNotEmpty) {
              exprs.add(t.invoiceNumber.like('%$search%'));
            }
            if (startDate != null) {
              exprs.add(t.saleDate.isBiggerThanValue(startDate));
            }
            if (endDate != null) {
              exprs.add(t.saleDate.isSmallerThanValue(endDate));
            }
            if (paymentMethod != null) {
              exprs.add(t.paymentMethod.equals(paymentMethod));
            }
            if (exprs.isNotEmpty) {
              return exprs.reduce((a, b) => a & b);
            }
            return const Constant(true);
          }))
        .get();
  }

  Future<SalesTableData?> getById(int id) {
    return (select(salesTable)..where((t) => t.id.equals(id))).getSingleOrNull();
  }

  Future<SalesTableData?> getByInvoice(String invoiceNumber) {
    return (select(salesTable)..where((t) => t.invoiceNumber.equals(invoiceNumber)))
        .getSingleOrNull();
  }

  Future<List<SaleItemsTableData>> getItems(int saleId) {
    return (select(saleItemsTable)..where((t) => t.saleId.equals(saleId))).get();
  }

  Future<int> insertSale(SalesTableCompanion sale) {
    return into(salesTable).insert(sale);
  }

  Future<int> insertSaleItem(SaleItemsTableCompanion item) {
    return into(saleItemsTable).insert(item);
  }

  Future<int> deleteSale(int id) {
    return (delete(salesTable)..where((t) => t.id.equals(id))).go();
  }

  Future<List<SalesTableData>> getUnsynced() {
    return (select(salesTable)..where((t) => t.isSynced.equals(false))).get();
  }

  Future<double> getTodaySalesTotal() {
    final today = DateTime.now();
    final startOfDay = DateTime(today.year, today.month, today.day);
    return (select(salesTable)
          ..where((t) => t.saleDate.isBiggerThanValue(startOfDay)))
        .map((s) => s.total)
        .getSingle();
  }

  Future<int> getTodayTransactionCount() {
    final today = DateTime.now();
    final startOfDay = DateTime(today.year, today.month, today.day);
    return (select(salesTable)
          ..where((t) => t.saleDate.isBiggerThanValue(startOfDay)))
        .get()
        .then((rows) => rows.length);
  }
}

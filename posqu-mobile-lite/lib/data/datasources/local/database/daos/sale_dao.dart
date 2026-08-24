import 'package:drift/drift.dart';
import '../app_database.dart';
import '../tables/sales_table.dart';

part 'sale_dao.g.dart';

@DriftAccessor(tables: [SalesTable, SaleItemsTable, PaymentsTable])
class SaleDao extends DatabaseAccessor<AppDatabase> with _$SaleDaoMixin {
  SaleDao(super.db);

  Expression<bool> _paymentMethodFilter(String paymentMethod) {
    final subquery = selectOnly(paymentsTable)
      ..addColumns([paymentsTable.saleId])
      ..where(paymentsTable.method.equals(paymentMethod));
    return salesTable.id.isInQuery(subquery);
  }

  Future<List<SalesTableData>> getAll({
    String? search,
    DateTime? startDate,
    DateTime? endDate,
    String? paymentMethod,
  }) {
    return (select(salesTable)
          ..orderBy([(t) => OrderingTerm(expression: t.createdAt, mode: OrderingMode.desc)])
          ..where((t) {
            final exprs = <Expression<bool>>[];
            if (search != null && search.isNotEmpty) {
              exprs.add(t.invoiceNo.like('%$search%'));
            }
            if (startDate != null) {
              exprs.add(t.createdAt.isBiggerThanValue(startDate));
            }
            if (endDate != null) {
              exprs.add(t.createdAt.isSmallerThanValue(endDate));
            }
            if (paymentMethod != null && paymentMethod.isNotEmpty) {
              exprs.add(_paymentMethodFilter(paymentMethod));
            }
            if (exprs.isNotEmpty) {
              return exprs.reduce((a, b) => a & b);
            }
            return const Constant(true);
          }))
        .get();
  }

  Future<SalesTableData?> getById(String id) {
    return (select(salesTable)..where((t) => t.id.equals(id))).getSingleOrNull();
  }

  Future<SalesTableData?> getByInvoice(String invoiceNo) {
    return (select(salesTable)..where((t) => t.invoiceNo.equals(invoiceNo)))
        .getSingleOrNull();
  }

  Future<List<SaleItemsTableData>> getItems(String saleId) {
    return (select(saleItemsTable)..where((t) => t.saleId.equals(saleId))).get();
  }

  Future<void> insertSale(SalesTableCompanion sale) async {
    await into(salesTable).insert(sale);
  }

  Future<void> insertSaleItem(SaleItemsTableCompanion item) async {
    await into(saleItemsTable).insert(item);
  }

  Future<int> deleteSale(String id) {
    return (delete(salesTable)..where((t) => t.id.equals(id))).go();
  }

  Future<List<SalesTableData>> getUnsynced() {
    return (select(salesTable)..where((t) => t.isSynced.equals(false))).get();
  }

  Future<double> getTodaySalesTotal() {
    final today = DateTime.now();
    final startOfDay = DateTime(today.year, today.month, today.day);
    return (select(salesTable)
          ..where((t) => t.createdAt.isBiggerThanValue(startOfDay)))
        .map((s) => s.total)
        .get()
        .then((rows) => rows.fold<double>(0, (sum, t) => sum + t));
  }

  Future<int> getTodayTransactionCount() {
    final today = DateTime.now();
    final startOfDay = DateTime(today.year, today.month, today.day);
    return (select(salesTable)
          ..where((t) => t.createdAt.isBiggerThanValue(startOfDay)))
        .get()
        .then((rows) => rows.length);
  }

  Future<double> sumTotalsBetween(DateTime start, DateTime end) {
    return (select(salesTable)
          ..where((t) =>
              t.createdAt.isBiggerOrEqualValue(start) &
              t.createdAt.isSmallerThanValue(end)))
        .map((s) => s.total)
        .get()
        .then((rows) => rows.fold<double>(0, (sum, t) => sum + t));
  }

  Future<void> markSynced(List<String> ids) {
    return (update(salesTable)..where((t) => t.id.isIn(ids)))
        .write(const SalesTableCompanion(isSynced: Value(true)));
  }
}

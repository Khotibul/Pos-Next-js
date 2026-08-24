import 'package:drift/drift.dart';
import '../app_database.dart';
import '../tables/purchases_table.dart';

part 'purchase_dao.g.dart';

@DriftAccessor(tables: [PurchasesTable, PurchaseItemsTable])
class PurchaseDao extends DatabaseAccessor<AppDatabase> with _$PurchaseDaoMixin {
  PurchaseDao(super.db);

  Future<List<PurchasesTableData>> getAll({String? search, DateTime? startDate, DateTime? endDate}) {
    return (select(purchasesTable)
          ..orderBy([(t) => OrderingTerm(expression: t.createdAt, mode: OrderingMode.desc)])
          ..where((t) {
            final exprs = <Expression<bool>>[];
            if (search != null && search.isNotEmpty) {
              exprs.add(t.orderNo.like('%$search%'));
            }
            if (startDate != null) {
              exprs.add(t.createdAt.isBiggerThanValue(startDate));
            }
            if (endDate != null) {
              exprs.add(t.createdAt.isSmallerThanValue(endDate));
            }
            if (exprs.isNotEmpty) {
              return exprs.reduce((a, b) => a & b);
            }
            return const Constant(true);
          }))
        .get();
  }

  Future<PurchasesTableData?> getById(String id) {
    return (select(purchasesTable)..where((t) => t.id.equals(id))).getSingleOrNull();
  }

  Future<List<PurchaseItemsTableData>> getItems(String purchaseOrderId) {
    return (select(purchaseItemsTable)..where((t) => t.purchaseOrderId.equals(purchaseOrderId)))
        .get();
  }

  Future<void> insertPurchase(PurchasesTableCompanion purchase) async {
    await into(purchasesTable).insert(purchase);
  }

  Future<void> insertPurchaseItem(PurchaseItemsTableCompanion item) async {
    await into(purchaseItemsTable).insert(item);
  }

  Future<int> deletePurchase(String id) {
    return (delete(purchasesTable)..where((t) => t.id.equals(id))).go();
  }

  Future<List<PurchasesTableData>> getUnsynced() {
    return (select(purchasesTable)..where((t) => t.isSynced.equals(false))).get();
  }
}

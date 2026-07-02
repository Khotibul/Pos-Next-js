import 'package:drift/drift.dart';
import '../app_database.dart';
import '../tables/purchases_table.dart';

part 'purchase_dao.g.dart';

@DriftAccessor(tables: [PurchasesTable, PurchaseItemsTable])
class PurchaseDao extends DatabaseAccessor<AppDatabase> with _$PurchaseDaoMixin {
  PurchaseDao(super.db);

  Future<List<PurchasesTableData>> getAll({String? search, DateTime? startDate, DateTime? endDate}) {
    return (select(purchasesTable)
          ..orderBy([(t) => OrderingTerm(expression: t.purchaseDate, mode: OrderingMode.desc)])
          ..where((t) {
            final exprs = <Expression<bool>>[];
            if (search != null && search.isNotEmpty) {
              exprs.add(t.invoiceNumber.like('%$search%'));
            }
            if (startDate != null) {
              exprs.add(t.purchaseDate.isBiggerThanValue(startDate));
            }
            if (endDate != null) {
              exprs.add(t.purchaseDate.isSmallerThanValue(endDate));
            }
            if (exprs.isNotEmpty) {
              return exprs.reduce((a, b) => a & b);
            }
            return const Constant(true);
          }))
        .get();
  }

  Future<PurchasesTableData?> getById(int id) {
    return (select(purchasesTable)..where((t) => t.id.equals(id))).getSingleOrNull();
  }

  Future<List<PurchaseItemsTableData>> getItems(int purchaseId) {
    return (select(purchaseItemsTable)..where((t) => t.purchaseId.equals(purchaseId)))
        .get();
  }

  Future<int> insertPurchase(PurchasesTableCompanion purchase) {
    return into(purchasesTable).insert(purchase);
  }

  Future<int> insertPurchaseItem(PurchaseItemsTableCompanion item) {
    return into(purchaseItemsTable).insert(item);
  }

  Future<int> deletePurchase(int id) {
    return (delete(purchasesTable)..where((t) => t.id.equals(id))).go();
  }

  Future<List<PurchasesTableData>> getUnsynced() {
    return (select(purchasesTable)..where((t) => t.isSynced.equals(false))).get();
  }
}

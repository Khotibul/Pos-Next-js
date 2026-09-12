import 'package:drift/drift.dart';
import '../app_database.dart';
import '../tables/receivables_table.dart';

part 'receivable_dao.g.dart';

@DriftAccessor(tables: [ReceivablesTable, ReceivablePaymentsTable])
class ReceivableDao extends DatabaseAccessor<AppDatabase> with _$ReceivableDaoMixin {
  ReceivableDao(super.db);

  Future<List<ReceivablesTableData>> getAll({String? search, String? status}) {
    return (select(receivablesTable)
          ..orderBy([(t) => OrderingTerm(expression: t.createdAt, mode: OrderingMode.desc)])
          ..where((t) {
            final exprs = <Expression<bool>>[];
            if (search != null && search.isNotEmpty) {
              exprs.add(t.invoiceNo.like('%$search%') | t.description.like('%$search%'));
            }
            if (status != null && status.isNotEmpty) {
              exprs.add(t.status.equals(status));
            }
            if (exprs.isNotEmpty) return exprs.reduce((a, b) => a & b);
            return const Constant(true);
          }))
        .get();
  }

  Future<ReceivablesTableData?> getById(String id) =>
      (select(receivablesTable)..where((t) => t.id.equals(id))).getSingleOrNull();

  Future<List<ReceivablePaymentsTableData>> getPayments(String receivableId) =>
      (select(receivablePaymentsTable)..where((t) => t.receivableId.equals(receivableId))..orderBy([(t) => OrderingTerm(expression: t.paidAt, mode: OrderingMode.desc)])).get();

  Future<List<ReceivablesTableData>> getUnsynced() =>
      (select(receivablesTable)..where((t) => t.isSynced.equals(false))).get();

  Future<List<ReceivablePaymentsTableData>> getUnsyncedPayments() =>
      (select(receivablePaymentsTable)..where((t) => t.isSynced.equals(false))).get();

  Future<void> markSynced(List<String> ids) =>
      (update(receivablesTable)..where((t) => t.id.isIn(ids))).write(const ReceivablesTableCompanion(isSynced: Value(true)));

  Future<void> markPaymentsSynced(List<String> ids) =>
      (update(receivablePaymentsTable)..where((t) => t.id.isIn(ids))).write(const ReceivablePaymentsTableCompanion(isSynced: Value(true)));

  Future<void> upsertReceivable(ReceivablesTableCompanion data) =>
      into(receivablesTable).insertOnConflictUpdate(data);

  Future<void> insertPayment(ReceivablePaymentsTableCompanion data) =>
      into(receivablePaymentsTable).insertOnConflictUpdate(data);

  Future<int> deleteReceivable(String id) =>
      (delete(receivablesTable)..where((t) => t.id.equals(id))).go();
}

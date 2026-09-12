import 'package:drift/drift.dart';
import '../app_database.dart';
import '../tables/payables_table.dart';

part 'payable_dao.g.dart';

@DriftAccessor(tables: [PayablesTable, PayablePaymentsTable])
class PayableDao extends DatabaseAccessor<AppDatabase> with _$PayableDaoMixin {
  PayableDao(super.db);

  Future<List<PayablesTableData>> getAll({String? search, String? status}) {
    return (select(payablesTable)
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

  Future<PayablesTableData?> getById(String id) =>
      (select(payablesTable)..where((t) => t.id.equals(id))).getSingleOrNull();

  Future<List<PayablePaymentsTableData>> getPayments(String payableId) =>
      (select(payablePaymentsTable)..where((t) => t.payableId.equals(payableId))..orderBy([(t) => OrderingTerm(expression: t.paidAt, mode: OrderingMode.desc)])).get();

  Future<List<PayablesTableData>> getUnsynced() =>
      (select(payablesTable)..where((t) => t.isSynced.equals(false))).get();

  Future<List<PayablePaymentsTableData>> getUnsyncedPayments() =>
      (select(payablePaymentsTable)..where((t) => t.isSynced.equals(false))).get();

  Future<void> markSynced(List<String> ids) =>
      (update(payablesTable)..where((t) => t.id.isIn(ids))).write(const PayablesTableCompanion(isSynced: Value(true)));

  Future<void> markPaymentsSynced(List<String> ids) =>
      (update(payablePaymentsTable)..where((t) => t.id.isIn(ids))).write(const PayablePaymentsTableCompanion(isSynced: Value(true)));

  Future<void> upsertPayable(PayablesTableCompanion data) =>
      into(payablesTable).insertOnConflictUpdate(data);

  Future<void> insertPayment(PayablePaymentsTableCompanion data) =>
      into(payablePaymentsTable).insertOnConflictUpdate(data);

  Future<int> deletePayable(String id) =>
      (delete(payablesTable)..where((t) => t.id.equals(id))).go();
}

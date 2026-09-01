import 'package:drift/drift.dart';
import '../app_database.dart';
import '../tables/cashier_shifts_table.dart';

part 'cash_transaction_dao.g.dart';

@DriftAccessor(tables: [CashTransactionsTable])
class CashTransactionDao extends DatabaseAccessor<AppDatabase>
    with _$CashTransactionDaoMixin {
  CashTransactionDao(super.db);

  Future<List<CashTransactionsTableData>> getAll({
    DateTime? startDate,
    DateTime? endDate,
    String? type,
  }) {
    return (select(cashTransactionsTable)
          ..orderBy([
            (t) => OrderingTerm(expression: t.transactionDate, mode: OrderingMode.desc)
          ])
          ..where((t) {
            final exprs = <Expression<bool>>[];
            if (startDate != null) {
              exprs.add(t.transactionDate.isBiggerThanValue(startDate));
            }
            if (endDate != null) {
              exprs.add(t.transactionDate.isSmallerThanValue(endDate));
            }
            if (type != null) {
              exprs.add(t.type.equals(type));
            }
            if (exprs.isNotEmpty) {
              return exprs.reduce((a, b) => a & b);
            }
            return const Constant(true);
          }))
        .get();
  }

  Future<void> insertTransaction(CashTransactionsTableCompanion transaction) async {
    await into(cashTransactionsTable).insert(transaction);
  }

  Future<double> getBalance() {
    return Future.wait([
      (select(cashTransactionsTable)..where((t) => t.type.equals('income')))
          .get()
          .then((rows) => rows.fold<double>(0, (sum, t) => sum + t.amount)),
      (select(cashTransactionsTable)..where((t) => t.type.equals('expense')))
          .get()
          .then((rows) => rows.fold<double>(0, (sum, t) => sum + t.amount)),
    ]).then((values) => values[0] - values[1]);
  }

  Future<double> sumByType(String type, {DateTime? startDate, DateTime? endDate}) {
    return (select(cashTransactionsTable)
          ..where((t) {
            final exprs = <Expression<bool>>[t.type.equals(type)];
            if (startDate != null) {
              exprs.add(t.transactionDate.isBiggerOrEqualValue(startDate));
            }
            if (endDate != null) {
              exprs.add(t.transactionDate.isSmallerOrEqualValue(endDate));
            }
            return exprs.reduce((a, b) => a & b);
          }))
        .map((t) => t.amount)
        .get()
        .then((rows) => rows.fold<double>(0, (sum, v) => sum + v));
  }

  Future<List<CashTransactionsTableData>> getUnsynced() {
    return (select(cashTransactionsTable)..where((t) => t.isSynced.equals(false))).get();
  }

  Future<void> markSynced(List<String> ids) {
    return (update(cashTransactionsTable)..where((t) => t.id.isIn(ids)))
        .write(const CashTransactionsTableCompanion(isSynced: Value(true)));
  }
}

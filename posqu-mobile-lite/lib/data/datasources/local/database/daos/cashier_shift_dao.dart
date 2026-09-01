import 'package:drift/drift.dart';
import '../app_database.dart';
import '../tables/cashier_shifts_table.dart';

part 'cashier_shift_dao.g.dart';

@DriftAccessor(tables: [CashierShiftsTable])
class CashierShiftDao extends DatabaseAccessor<AppDatabase>
    with _$CashierShiftDaoMixin {
  CashierShiftDao(super.db);

  Future<List<CashierShiftsTableData>> getAll({DateTime? startDate, DateTime? endDate}) {
    return (select(cashierShiftsTable)
          ..orderBy([(t) => OrderingTerm(expression: t.openedAt, mode: OrderingMode.desc)])
          ..where((t) {
            final exprs = <Expression<bool>>[];
            if (startDate != null) {
              exprs.add(t.openedAt.isBiggerThanValue(startDate));
            }
            if (endDate != null) {
              exprs.add(t.openedAt.isSmallerThanValue(endDate));
            }
            if (exprs.isNotEmpty) {
              return exprs.reduce((a, b) => a & b);
            }
            return const Constant(true);
          }))
        .get();
  }

  Future<CashierShiftsTableData?> getActiveShift(String cashierId) {
    return (select(cashierShiftsTable)
          ..where((t) =>
              t.cashierId.equals(cashierId) & t.status.equals('OPEN')))
        .getSingleOrNull();
  }

  Future<CashierShiftsTableData?> getById(String id) {
    return (select(cashierShiftsTable)..where((t) => t.id.equals(id)))
        .getSingleOrNull();
  }

  Future<void> insertShift(CashierShiftsTableCompanion shift) async {
    await into(cashierShiftsTable).insert(shift);
  }

  Future<bool> updateShift(CashierShiftsTableCompanion shift) async {
    if (!shift.id.present) return false;
    final targetId = shift.id.value;
    final count = await (update(cashierShiftsTable)..where((t) => t.id.equals(targetId))).write(shift);
    return count > 0;
  }

  Future<List<CashierShiftsTableData>> getUnsynced() {
    return (select(cashierShiftsTable)..where((t) => t.isSynced.equals(false))).get();
  }

  Future<void> markSynced(List<String> ids) {
    return (update(cashierShiftsTable)..where((t) => t.id.isIn(ids)))
        .write(const CashierShiftsTableCompanion(isSynced: Value(true)));
  }
}

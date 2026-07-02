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
          ..orderBy([(t) => OrderingTerm(expression: t.openTime, mode: OrderingMode.desc)])
          ..where((t) {
            final exprs = <Expression<bool>>[];
            if (startDate != null) {
              exprs.add(t.openTime.isBiggerThanValue(startDate));
            }
            if (endDate != null) {
              exprs.add(t.openTime.isSmallerThanValue(endDate));
            }
            if (exprs.isNotEmpty) {
              return exprs.reduce((a, b) => a & b);
            }
            return const Constant(true);
          }))
        .get();
  }

  Future<CashierShiftsTableData?> getActiveShift(int userId) {
    return (select(cashierShiftsTable)
          ..where((t) => t.userId.equals(userId) & t.status.equals('open')))
        .getSingleOrNull();
  }

  Future<CashierShiftsTableData?> getById(int id) {
    return (select(cashierShiftsTable)..where((t) => t.id.equals(id)))
        .getSingleOrNull();
  }

  Future<int> insertShift(CashierShiftsTableCompanion shift) {
    return into(cashierShiftsTable).insert(shift);
  }

  Future<bool> updateShift(CashierShiftsTableCompanion shift) {
    return update(cashierShiftsTable).replace(shift);
  }
}

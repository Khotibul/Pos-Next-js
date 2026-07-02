import 'package:drift/drift.dart';
import '../app_database.dart';
import '../tables/returns_table.dart';

part 'return_dao.g.dart';

@DriftAccessor(tables: [ReturnsTable, ReturnItemsTable])
class ReturnDao extends DatabaseAccessor<AppDatabase> with _$ReturnDaoMixin {
  ReturnDao(super.db);

  Future<List<ReturnsTableData>> getAll({
    String? search,
    DateTime? startDate,
    DateTime? endDate,
    String? type,
  }) {
    return (select(returnsTable)
          ..orderBy([(t) => OrderingTerm(expression: t.returnDate, mode: OrderingMode.desc)])
          ..where((t) {
            final exprs = <Expression<bool>>[];
            if (search != null && search.isNotEmpty) {
              exprs.add(t.returnNumber.like('%$search%'));
            }
            if (startDate != null) {
              exprs.add(t.returnDate.isBiggerThanValue(startDate));
            }
            if (endDate != null) {
              exprs.add(t.returnDate.isSmallerThanValue(endDate));
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

  Future<ReturnsTableData?> getById(int id) {
    return (select(returnsTable)..where((t) => t.id.equals(id))).getSingleOrNull();
  }

  Future<List<ReturnItemsTableData>> getItems(int returnId) {
    return (select(returnItemsTable)..where((t) => t.returnId.equals(returnId)))
        .get();
  }

  Future<int> insertReturn(ReturnsTableCompanion returnData) {
    return into(returnsTable).insert(returnData);
  }

  Future<int> insertReturnItem(ReturnItemsTableCompanion item) {
    return into(returnItemsTable).insert(item);
  }
}

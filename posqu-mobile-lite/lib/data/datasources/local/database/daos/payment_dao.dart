import 'package:drift/drift.dart';
import '../app_database.dart';
import '../tables/sales_table.dart';

part 'payment_dao.g.dart';

@DriftAccessor(tables: [PaymentsTable])
class PaymentDao extends DatabaseAccessor<AppDatabase> with _$PaymentDaoMixin {
  PaymentDao(super.db);

  Future<List<PaymentsTableData>> getBySaleId(String saleId) {
    return (select(paymentsTable)..where((t) => t.saleId.equals(saleId))).get();
  }

  Future<void> insertPayment(PaymentsTableCompanion payment) async {
    await into(paymentsTable).insert(payment);
  }

  Future<void> upsertPayment(PaymentsTableCompanion payment) async {
    await into(paymentsTable).insertOnConflictUpdate(payment);
  }

  Future<void> deleteBySaleId(String saleId) async {
    await (delete(paymentsTable)..where((t) => t.saleId.equals(saleId))).go();
  }
}

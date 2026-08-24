import 'dart:io';
import 'package:drift/drift.dart';
import 'package:drift/native.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:uuid/uuid.dart';

import 'tables/users_table.dart';
import 'tables/categories_table.dart';
import 'tables/products_table.dart';
import 'tables/suppliers_table.dart';
import 'tables/customers_table.dart';
import 'tables/purchases_table.dart';
import 'tables/sales_table.dart';
import 'tables/returns_table.dart';
import 'tables/cashier_shifts_table.dart';
import 'tables/sync_queue_table.dart';
import 'daos/user_dao.dart';
import 'daos/category_dao.dart';
import 'daos/product_dao.dart';
import 'daos/supplier_dao.dart';
import 'daos/customer_dao.dart';
import 'daos/purchase_dao.dart';
import 'daos/sale_dao.dart';
import 'daos/payment_dao.dart';
import 'daos/return_dao.dart';
import 'daos/cashier_shift_dao.dart';
import 'daos/cash_transaction_dao.dart';
import 'daos/sync_queue_dao.dart';

part 'app_database.g.dart';

@DriftDatabase(
  tables: [
    UsersTable,
    CategoriesTable,
    ProductsTable,
    SuppliersTable,
    CustomersTable,
    PurchasesTable,
    PurchaseItemsTable,
    SalesTable,
    SaleItemsTable,
    PaymentsTable,
    ReturnsTable,
    ReturnItemsTable,
    CashierShiftsTable,
    CashTransactionsTable,
    SyncQueueTable,
  ],
  daos: [
    UserDao,
    CategoryDao,
    ProductDao,
    SupplierDao,
    CustomerDao,
    PurchaseDao,
    SaleDao,
    PaymentDao,
    ReturnDao,
    CashierShiftDao,
    CashTransactionDao,
    SyncQueueDao,
  ],
)
class AppDatabase extends _$AppDatabase {
  AppDatabase() : super(_openConnection());

  @override
  int get schemaVersion => 2;

  @override
  MigrationStrategy get migration {
    return MigrationStrategy(
      onCreate: (m) async {
        await m.createAll();
      },
      onUpgrade: (m, from, to) async {
        if (from < 2) {
          await m.deleteTable('users_table');
          await m.deleteTable('categories_table');
          await m.deleteTable('products_table');
          await m.deleteTable('suppliers_table');
          await m.deleteTable('customers_table');
          await m.deleteTable('purchases_table');
          await m.deleteTable('purchase_items_table');
          await m.deleteTable('sales_table');
          await m.deleteTable('sale_items_table');
          await m.deleteTable('returns_table');
          await m.deleteTable('return_items_table');
          await m.deleteTable('cashier_shifts_table');
          await m.createAll();
        }
      },
      beforeOpen: (details) async {
        if (details.wasCreated) {
          await _seedInitialData();
        }
      },
    );
  }

  Future<void> _seedInitialData() async {
    await into(usersTable).insert(
      UsersTableCompanion.insert(
        id: Value(const Uuid().v4()),
        email: const Value('admin@posqu.local'),
        name: const Value('Administrator'),
        passwordHash: const Value(
          '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',
        ),
        isActive: const Value(true),
      ),
    );
    await into(categoriesTable).insert(
      CategoriesTableCompanion.insert(
        id: Value(const Uuid().v4()),
        name: 'Umum',
      ),
    );
  }
}

LazyDatabase _openConnection() {
  return LazyDatabase(() async {
    final dbFolder = await getApplicationDocumentsDirectory();
    final file = File(p.join(dbFolder.path, 'posqu_mobile_lite.db'));

    return NativeDatabase(file);
  });
}

final appDatabaseProvider = Provider<AppDatabase>((ref) {
  return AppDatabase();
});

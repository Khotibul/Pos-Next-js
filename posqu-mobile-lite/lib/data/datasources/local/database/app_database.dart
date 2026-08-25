import 'dart:convert';
import 'dart:io';

import 'package:drift/drift.dart';
import 'package:drift/native.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter/services.dart' show rootBundle;
import 'package:hive_flutter/hive_flutter.dart';
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
  int get schemaVersion => 3;

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
        if (from < 3) {
          // Non-destruktif: penanda sinkronisasi untuk master data.
          await m.addColumn(productsTable, productsTable.isSynced);
          await m.addColumn(categoriesTable, categoriesTable.isSynced);
          await m.addColumn(customersTable, customersTable.isSynced);
          await m.addColumn(suppliersTable, suppliersTable.isSynced);
        }
      },
      beforeOpen: (details) async {
        if (details.wasCreated) {
          await _seedInitialData();
        }
        await _seedFromBundleIfEmpty();
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

  static const String _bundleAsset = 'assets/seed/initial_data.json';

  /// Mengisi SQLite dari bundel data sistem (assets/seed/initial_data.json)
  /// hanya ketika tabel masih kosong. Aman dijalankan berulang.
  Future<void> _seedFromBundleIfEmpty() async {
    try {
      final cache = await Hive.openBox('cache');
      if (cache.get('seed_bundle_applied') == true) return;

      final existingProducts = await select(productsTable).get();
      if (existingProducts.isNotEmpty) {
        await cache.put('seed_bundle_applied', true);
        return;
      }

      final raw = await rootBundle.loadString(_bundleAsset);
      final data = jsonDecode(raw) as Map<String, dynamic>;
      if ((data['products'] as List? ?? []).isEmpty &&
          (data['sales'] as List? ?? []).isEmpty) {
        await cache.put('seed_bundle_applied', true);
        return;
      }

      await transaction(() async {
        // Kategori
        for (final c in (data['categories'] as List? ?? [])) {
          final j = c as Map<String, dynamic>;
          await into(categoriesTable).insertOnConflictUpdate(
            CategoriesTableCompanion(
              id: Value(j['id'] as String),
              name: Value(j['name'] as String? ?? ''),
              createdAt: Value(
                  DateTime.tryParse(j['createdAt'] as String? ?? '') ??
                      DateTime.now()),
              updatedAt: Value(
                  DateTime.tryParse(j['updatedAt'] as String? ?? '') ??
                      DateTime.now()),
            ),
          );
        }

        // Produk
        for (final item in (data['products'] as List? ?? [])) {
          final j = item as Map<String, dynamic>;
          await into(productsTable).insertOnConflictUpdate(
            ProductsTableCompanion(
              id: Value(j['id'] as String),
              sku: Value(j['sku'] as String? ?? ''),
              slug: Value(j['slug'] as String?),
              name: Value(j['name'] as String? ?? ''),
              description: Value(j['description'] as String?),
              barcode: Value(j['barcode'] as String?),
              qrCode: Value(j['qrCode'] as String?),
              categoryId: Value(j['categoryId'] as String?),
              brandId: Value(j['brandId'] as String?),
              supplierId: Value(j['supplierId'] as String?),
              unitId: Value(j['unitId'] as String?),
              costPrice: Value(_toDouble(j['costPrice'])),
              sellingPrice: Value(_toDouble(j['sellingPrice'])),
              marginPct: Value(_toDouble(j['marginPct'])),
              taxRate: Value(_toDouble(j['taxRate'])),
              minStock: Value(_toDouble(j['minStock'])),
              reorderPoint: Value(_toDouble(j['reorderPoint'])),
              wholesalePrice: Value(_toDouble(j['wholesalePrice'])),
              wholesaleDiscountPercent:
                  Value(_toDouble(j['wholesaleDiscountPercent'])),
              wholesaleMinQty: Value((j['wholesaleMinQty'] as num?)?.toInt() ?? 0),
              isActive: Value(j['isActive'] as bool? ?? true),
              isFeatured: Value(j['isFeatured'] as bool? ?? false),
              isConsignment: Value(j['isConsignment'] as bool? ?? false),
              type: Value(j['type'] as String? ?? 'SINGLE'),
              unit: Value(j['unit'] as String? ?? 'pcs'),
            ),
          );
        }

        // Pelanggan
        for (final item in (data['customers'] as List? ?? [])) {
          final j = item as Map<String, dynamic>;
          await into(customersTable).insertOnConflictUpdate(
            CustomersTableCompanion(
              id: Value(j['id'] as String),
              name: Value(j['name'] as String? ?? ''),
              email: Value(j['email'] as String?),
              phone: Value(j['phone'] as String?),
              address: Value(j['address'] as String?),
              isActive: Value(j['isActive'] as bool? ?? true),
            ),
          );
        }

        // Pemasok
        for (final item in (data['suppliers'] as List? ?? [])) {
          final j = item as Map<String, dynamic>;
          await into(suppliersTable).insertOnConflictUpdate(
            SuppliersTableCompanion(
              id: Value(j['id'] as String),
              name: Value(j['name'] as String? ?? ''),
              email: Value(j['email'] as String?),
              phone: Value(j['phone'] as String?),
              address: Value(j['address'] as String?),
              isActive: Value(j['isActive'] as bool? ?? true),
            ),
          );
        }

        // Penjualan + item + pembayaran
        for (final item in (data['sales'] as List? ?? [])) {
          final s = item as Map<String, dynamic>;
          final saleId = s['id'] as String;
          final createdAt =
              DateTime.tryParse(s['createdAt'] as String? ?? '') ??
                  DateTime.now();
          await into(salesTable).insertOnConflictUpdate(
            SalesTableCompanion(
              id: Value(saleId),
              invoiceNo: Value(s['invoiceNo'] as String? ?? saleId),
              cashierId: Value(s['cashierId'] as String?),
              shiftId: Value(s['shiftId'] as String?),
              status: Value(s['status'] as String? ?? 'PAID'),
              subtotal: Value(_toDouble(s['subtotal'])),
              discount: Value(_toDouble(s['discount'])),
              tax: Value(_toDouble(s['tax'])),
              total: Value(_toDouble(s['total'])),
              isSynced: const Value(true),
              createdAt: Value(createdAt),
              updatedAt: Value(
                  DateTime.tryParse(s['updatedAt'] as String? ?? '') ??
                      createdAt),
            ),
          );
          for (final raw in (s['items'] as List? ?? [])) {
            final i = raw as Map<String, dynamic>;
            await into(saleItemsTable).insertOnConflictUpdate(
              SaleItemsTableCompanion(
                id: Value(i['id'] as String),
                saleId: Value(i['saleId'] as String? ?? saleId),
                productId: Value(i['productId'] as String? ?? ''),
                name: Value(i['name'] as String? ?? ''),
                sku: Value(i['sku'] as String? ?? ''),
                price: Value(_toDouble(i['price'])),
                qty: Value(_toDouble(i['qty'])),
                lineTotal: Value(_toDouble(i['lineTotal'])),
              ),
            );
          }
          await into(paymentsTable).insertOnConflictUpdate(
            PaymentsTableCompanion(
              id: Value(const Uuid().v4()),
              saleId: Value(saleId),
              method: Value(s['paymentMethod'] as String? ?? 'cash'),
              amount: Value(_toDouble(s['total'])),
              receivedAmount: Value(_toDouble(s['paidAmount'])),
              changeAmount: Value(_toDouble(s['changeAmount'])),
              reference: Value(s['paymentReference'] as String?),
              createdAt: Value(createdAt),
            ),
          );
        }
      });

      await cache.put('seed_bundle_applied', true);
    } catch (_) {
      // Bundel tidak tersedia (mis. build web) atau format salah ->
      // biarkan database lokal tetap berjalan normal.
    }
  }

  static double _toDouble(Object? value) {
    if (value is num) return value.toDouble();
    if (value is String) return double.tryParse(value) ?? 0;
    return 0;
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

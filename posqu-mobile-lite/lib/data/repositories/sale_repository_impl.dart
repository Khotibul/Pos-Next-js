import 'package:dartz/dartz.dart';
import 'package:drift/drift.dart' show Value;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';

import '../../core/errors/failures.dart';
import '../../domain/entities/sale.dart';
import '../../domain/repositories/sale_repository.dart';
import '../datasources/local/database/app_database.dart';
import '../datasources/remote/sale_remote_datasource.dart';
import '../models/sale_model.dart';

final saleRepositoryProvider = Provider<SaleRepository>((ref) {
  return SaleRepositoryImpl(
    remoteDataSource: ref.read(saleRemoteDataSourceProvider),
    database: ref.read(appDatabaseProvider),
  );
});

class SaleRepositoryImpl implements SaleRepository {
  final SaleRemoteDataSource remoteDataSource;
  final AppDatabase database;

  SaleRepositoryImpl({
    required this.remoteDataSource,
    required this.database,
  });

  @override
  Future<Either<Failure, Sale>> createSale(Sale sale) async {
    try {
      final saleModel = SaleModel.fromEntity(sale);
      final created = await remoteDataSource.createSale(saleModel.toJson());
      return Right(created.toEntity());
    } catch (e) {
      try {
        await _saveSaleLocally(sale);
        return Right(sale);
      } catch (localError) {
        return Left(DatabaseFailure(message: 'Gagal menyimpan penjualan: $localError'));
      }
    }
  }

  Future<void> _saveSaleLocally(Sale sale) async {
    await database.transaction(() async {
      await database.saleDao.insertSale(
        SalesTableCompanion(
          id: Value(sale.id),
          invoiceNo: Value(sale.invoiceNo),
          cashierId: Value(sale.cashierId),
          shiftId: Value(sale.shiftId),
          customerId: Value(sale.customerId),
          status: Value(sale.status),
          subtotal: Value(sale.subtotal),
          discount: Value(sale.discount),
          tax: Value(sale.tax),
          total: Value(sale.total),
          notes: Value(sale.notes),
          isSynced: const Value(false),
        ),
      );
      for (final item in sale.items) {
        await database.saleDao.insertSaleItem(
          SaleItemsTableCompanion(
            id: Value(item.id),
            saleId: Value(sale.id),
            productId: Value(item.productId),
            name: Value(item.name),
            sku: Value(item.sku),
            price: Value(item.price),
            qty: Value(item.qty),
            lineTotal: Value(item.lineTotal),
          ),
        );
      }
      if (sale.paidAmount > 0 || sale.paymentMethod.isNotEmpty) {
        await database.paymentDao.insertPayment(
          PaymentsTableCompanion(
            id: Value(const Uuid().v4()),
            saleId: Value(sale.id),
            method: Value(sale.paymentMethod),
            amount: Value(sale.total),
            receivedAmount: Value(sale.paidAmount),
            changeAmount: Value(sale.changeAmount),
            reference: Value(sale.paymentReference),
          ),
        );
      }
      for (final item in sale.items) {
        final product = await database.productDao.getById(item.productId);
        if (product != null) {
          final newStock = product.stock - item.qty.toInt();
          await database.productDao.updateStock(item.productId, newStock);
        }
      }
    });
  }

  @override
  Future<Either<Failure, void>> deleteSale(String id) async {
    try {
      await remoteDataSource.deleteSale(id);
      return const Right(null);
    } catch (e) {
      return const Left(ServerFailure(message: 'Gagal menghapus penjualan'));
    }
  }

  @override
  Future<Either<Failure, Sale>> getSale(String id) async {
    try {
      final sale = await database.saleDao.getById(id);
      if (sale == null) return const Left(DatabaseFailure(message: 'Penjualan tidak ditemukan'));
      final items = await database.saleDao.getItems(id);
      return Right(await _toEntity(sale, items));
    } catch (e) {
      return const Left(DatabaseFailure(message: 'Gagal mengambil data penjualan'));
    }
  }

  @override
  Future<Either<Failure, Sale>> getSaleByInvoice(String invoiceNo) async {
    try {
      final sale = await database.saleDao.getByInvoice(invoiceNo);
      if (sale == null) {
        return const Left(DatabaseFailure(message: 'Invoice tidak ditemukan'));
      }
      final items = await database.saleDao.getItems(sale.id);
      return Right(await _toEntity(sale, items));
    } catch (e) {
      return const Left(DatabaseFailure(message: 'Gagal mencari invoice'));
    }
  }

  @override
  Future<Either<Failure, List<Sale>>> getSales({
    int page = 1,
    int limit = 20,
    String? search,
    DateTime? startDate,
    DateTime? endDate,
    String? paymentMethod,
  }) async {
    try {
      final sales = await database.saleDao.getAll(
        search: search,
        startDate: startDate,
        endDate: endDate,
        paymentMethod: paymentMethod,
      );
      final result = <Sale>[];
      for (final sale in sales) {
        final items = await database.saleDao.getItems(sale.id);
        result.add(await _toEntity(sale, items));
      }
      return Right(result);
    } catch (e) {
      return const Left(DatabaseFailure(message: 'Gagal mengambil data penjualan'));
    }
  }

  Future<Sale> _toEntity(SalesTableData d, List<SaleItemsTableData> items) async {
    String? customerName;
    if (d.customerId != null) {
      final customer = await database.customerDao.getById(d.customerId!);
      customerName = customer?.name;
    }

    String paymentMethod = 'cash';
    double paidAmount = d.total;
    double changeAmount = 0;
    String? paymentReference;
    final payments = await database.paymentDao.getBySaleId(d.id);
    if (payments.isNotEmpty) {
      final p = payments.first;
      paymentMethod = p.method;
      paidAmount = p.receivedAmount;
      changeAmount = p.changeAmount;
      paymentReference = p.reference;
    }

    return Sale(
      id: d.id,
      invoiceNo: d.invoiceNo,
      cashierId: d.cashierId,
      shiftId: d.shiftId,
      customerId: d.customerId,
      customerName: customerName,
      createdAt: d.createdAt,
      status: d.status,
      paymentMethod: paymentMethod,
      paymentReference: paymentReference,
      subtotal: d.subtotal,
      discount: d.discount,
      tax: d.tax,
      total: d.total,
      paidAmount: paidAmount,
      changeAmount: changeAmount,
      notes: d.notes,
      items: items.map((i) => _toSaleItemEntity(i)).toList(),
      updatedAt: d.updatedAt,
    );
  }

  SaleItem _toSaleItemEntity(SaleItemsTableData i) {
    return SaleItem(
      id: i.id,
      saleId: i.saleId,
      productId: i.productId,
      name: i.name,
      sku: i.sku,
      qty: i.qty,
      price: i.price,
      lineTotal: i.lineTotal,
    );
  }
}

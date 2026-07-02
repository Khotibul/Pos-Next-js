import 'package:dartz/dartz.dart';
import 'package:drift/drift.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

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
      final saleModel = _toModel(sale);
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
    final companion = SalesTableCompanion(
      invoiceNumber: Value(sale.invoiceNumber),
      customerId: Value(sale.customerId),
      userId: Value(sale.userId),
      saleDate: Value(sale.saleDate),
      status: Value(sale.status),
      paymentMethod: Value(sale.paymentMethod),
      paymentReference: Value(sale.paymentReference),
      subtotal: Value(sale.subtotal),
      discount: Value(sale.discount),
      tax: Value(sale.tax),
      total: Value(sale.total),
      paidAmount: Value(sale.paidAmount),
      changeAmount: Value(sale.changeAmount),
      notes: Value(sale.notes),
      isSynced: const Value(false),
    );
    final saleId = await database.saleDao.insertSale(companion);
    for (final item in sale.items) {
      await database.saleDao.insertSaleItem(
        SaleItemsTableCompanion(
          saleId: Value(saleId),
          productId: Value(item.productId),
          quantity: Value(item.quantity),
          sellingPrice: Value(item.sellingPrice),
          discount: Value(item.discount),
          subtotal: Value(item.subtotal),
        ),
      );
    }
    for (final item in sale.items) {
      final product = await database.productDao.getById(item.productId);
      if (product != null) {
        final newStock = product.stock - item.quantity.toInt();
        await database.productDao.updateStock(item.productId, newStock);
      }
    }
  }

  @override
  Future<Either<Failure, void>> deleteSale(int id) async {
    try {
      await remoteDataSource.deleteSale(id);
      return const Right(null);
    } catch (e) {
      return const Left(ServerFailure(message: 'Gagal menghapus penjualan'));
    }
  }

  @override
  Future<Either<Failure, Sale>> getSale(int id) async {
    try {
      final sale = await database.saleDao.getById(id);
      if (sale == null) return const Left(DatabaseFailure(message: 'Penjualan tidak ditemukan'));
      final items = await database.saleDao.getItems(id);
      return Right(_toEntity(sale, items));
    } catch (e) {
      return const Left(DatabaseFailure(message: 'Gagal mengambil data penjualan'));
    }
  }

  @override
  Future<Either<Failure, Sale>> getSaleByInvoice(String invoiceNumber) async {
    try {
      final sale = await database.saleDao.getByInvoice(invoiceNumber);
      if (sale == null) {
        return const Left(DatabaseFailure(message: 'Invoice tidak ditemukan'));
      }
      final items = await database.saleDao.getItems(sale.id);
      return Right(_toEntity(sale, items));
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
        result.add(_toEntity(sale, items));
      }
      return Right(result);
    } catch (e) {
      return const Left(DatabaseFailure(message: 'Gagal mengambil data penjualan'));
    }
  }

  Sale _toEntity(SalesTableData d, List<SaleItemsTableData> items) {
    return Sale(
      id: d.id,
      invoiceNumber: d.invoiceNumber,
      customerId: d.customerId,
      userId: d.userId,
      saleDate: d.saleDate,
      status: d.status,
      paymentMethod: d.paymentMethod,
      paymentReference: d.paymentReference,
      subtotal: d.subtotal,
      discount: d.discount,
      tax: d.tax,
      total: d.total,
      paidAmount: d.paidAmount,
      changeAmount: d.changeAmount,
      notes: d.notes,
      items: items.map((i) => _toSaleItemEntity(i)).toList(),
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    );
  }

  SaleItem _toSaleItemEntity(SaleItemsTableData i) {
    return SaleItem(
      id: i.id,
      saleId: i.saleId,
      productId: i.productId,
      quantity: i.quantity,
      sellingPrice: i.sellingPrice,
      discount: i.discount,
      subtotal: i.subtotal,
    );
  }

  SaleModel _toModel(Sale sale) {
    return SaleModel(
      id: sale.id,
      invoiceNumber: sale.invoiceNumber,
      customerId: sale.customerId,
      customerName: sale.customerName,
      userId: sale.userId,
      userName: sale.userName,
      saleDate: sale.saleDate,
      status: sale.status,
      paymentMethod: sale.paymentMethod,
      paymentReference: sale.paymentReference,
      subtotal: sale.subtotal,
      discount: sale.discount,
      tax: sale.tax,
      total: sale.total,
      paidAmount: sale.paidAmount,
      changeAmount: sale.changeAmount,
      notes: sale.notes,
      items: sale.items.map((i) => SaleItemModel(
        id: i.id,
        saleId: i.saleId,
        productId: i.productId,
        productName: i.productName,
        productCode: i.productCode,
        barcode: i.barcode,
        quantity: i.quantity,
        sellingPrice: i.sellingPrice,
        discount: i.discount,
        subtotal: i.subtotal,
        unit: i.unit,
      )).toList(),
      createdAt: sale.createdAt,
      updatedAt: sale.updatedAt,
    );
  }
}

import 'package:dartz/dartz.dart';
import 'package:drift/drift.dart' show Value;
import 'package:dio/dio.dart' show DioException;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';

import '../../core/errors/failures.dart';
import '../../core/network/mobile_api_gate.dart';
import '../../core/network/network_info.dart';
import '../../domain/entities/sale.dart';
import '../../domain/repositories/sale_repository.dart';
import '../datasources/local/database/app_database.dart';
import '../datasources/remote/sale_remote_datasource.dart';
import '../models/sale_model.dart';

final saleRepositoryProvider = Provider<SaleRepository>((ref) {
  return SaleRepositoryImpl(
    remoteDataSource: ref.read(saleRemoteDataSourceProvider),
    database: ref.read(appDatabaseProvider),
    networkInfo: ref.read(networkInfoProvider),
  );
});

class SaleRepositoryImpl implements SaleRepository {
  final SaleRemoteDataSource remoteDataSource;
  final AppDatabase database;
  final NetworkInfo networkInfo;

  SaleRepositoryImpl({
    required this.remoteDataSource,
    required this.database,
    required this.networkInfo,
  });

  @override
  Future<Either<Failure, Sale>> createSale(Sale sale) async {
    try {
      await _saveSaleLocally(sale);
    } catch (localError) {
      return Left(DatabaseFailure(message: 'Gagal menyimpan penjualan: $localError'));
    }

    if (await networkInfo.isConnected) {
      try {
        final payload = Map<String, dynamic>.from(SaleModel.fromEntity(sale).toJson());
        payload['paidAmount'] = sale.paidAmount;
        payload['changeAmount'] = sale.changeAmount;
        payload['paymentMethod'] = sale.paymentMethod;
        payload['paymentReference'] = sale.paymentReference;
        await remoteDataSource.createSale(payload);
        await database.saleDao.markSynced([sale.id]);
      } catch (_) {
        // Gagal push -> tetap tersimpan lokal, akan dicoba sync berikutnya.
      }
    }

    return Right(sale);
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

  /// Dorong penjualan yang dibuat offline (isSynced=false) ke server.
  /// Gagal koneksi -> hentikan (dicoba lagi sync berikutnya);
  /// gagal validasi (400) -> tandai synced agar tidak loop selamanya.
  Future<void> _pushPendingSales() async {
    final pending = await database.saleDao.getUnsynced();
    for (final row in pending) {
      try {
        final items = await database.saleDao.getItems(row.id);
        final payments = await database.paymentDao.getBySaleId(row.id);
        final p = payments.isNotEmpty ? payments.first : null;

        final model = SaleModel(
          id: row.id,
          invoiceNo: row.invoiceNo,
          cashierId: row.cashierId,
          shiftId: row.shiftId,
          customerId: row.customerId,
          status: row.status,
          subtotal: row.subtotal,
          discount: row.discount,
          tax: row.tax,
          total: row.total,
          paidAmount: p?.receivedAmount ?? row.total,
          changeAmount: p?.changeAmount ?? 0,
          paymentMethod: p?.method ?? 'cash',
          paymentReference: p?.reference,
          notes: row.notes,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          items: items
              .map((i) => SaleItemModel(
                    id: i.id,
                    saleId: i.saleId,
                    productId: i.productId,
                    name: i.name,
                    sku: i.sku,
                    qty: i.qty,
                    price: i.price,
                    lineTotal: i.lineTotal,
                  ))
              .toList(),
        );
        final payload = Map<String, dynamic>.from(model.toJson());
        payload['paidAmount'] = model.paidAmount;
        payload['changeAmount'] = model.changeAmount;
        payload['paymentMethod'] = model.paymentMethod;
        payload['paymentReference'] = model.paymentReference;

        await remoteDataSource.createSale(payload);
        await database.saleDao.markSynced([row.id]);
      } on DioException catch (e) {
        if (e.response?.statusCode == 400) {
          await database.saleDao.markSynced([row.id]);
          continue;
        }
        break; // koneksi bermasalah -> coba lagi sync berikutnya
      } catch (_) {
        break;
      }
    }
  }

  /// Tarik penjualan dari server (dibuat lewat website) ke SQLite lokal.
  /// Dedup berdasarkan invoiceNo agar transaksi yang di-push dari mobile
  /// tidak dobel.
  Future<void> _syncFromServer() async {
    if (!await networkInfo.isConnected) return;
    if (MobileApiGate.isDisabled('sales')) return;

    await _pushPendingSales();
    try {
      final remote = await remoteDataSource.getSales(limit: 100);
      for (final model in remote) {
        final existing = await database.saleDao.getByInvoice(model.invoiceNo);
        if (existing != null) continue;

        await database.transaction(() async {
          await database.saleDao.upsertSale(
            SalesTableCompanion(
              id: Value(model.id),
              invoiceNo: Value(model.invoiceNo),
              cashierId: Value(model.cashierId),
              shiftId: Value(model.shiftId),
              customerId: Value(model.customerId),
              status: Value(model.status),
              subtotal: Value(model.subtotal),
              discount: Value(model.discount),
              tax: Value(model.tax),
              total: Value(model.total),
              notes: Value(model.notes),
              isSynced: const Value(true),
              createdAt: Value(model.createdAt),
              updatedAt: Value(model.updatedAt),
            ),
          );
          for (final item in model.items) {
            await database.saleDao.upsertSaleItem(
              SaleItemsTableCompanion(
                id: Value(item.id),
                saleId: Value(model.id),
                productId: Value(item.productId),
                name: Value(item.name),
                sku: Value(item.sku),
                price: Value(item.price),
                qty: Value(item.qty),
                lineTotal: Value(item.lineTotal),
              ),
            );
          }
          await database.paymentDao.upsertPayment(
            PaymentsTableCompanion(
              id: Value(const Uuid().v4()),
              saleId: Value(model.id),
              method: Value(model.paymentMethod),
              amount: Value(model.total),
              receivedAmount: Value(model.paidAmount),
              changeAmount: Value(model.changeAmount),
              reference: Value(model.paymentReference),
              createdAt: Value(model.createdAt),
            ),
          );
        });
      }
    } on DioException catch (e) {
      if (e.response?.statusCode == 404 || e.response?.statusCode == 501) {
        MobileApiGate.disable('sales');
      }
    } catch (_) {
      // Offline / gangguan lain -> tetap pakai SQLite lokal.
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
      await _syncFromServer();
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

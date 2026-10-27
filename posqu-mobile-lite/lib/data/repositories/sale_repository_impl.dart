import 'dart:async';
import 'dart:convert';

import 'package:dartz/dartz.dart';
import 'package:drift/drift.dart' show Value;
import 'package:dio/dio.dart' show DioException;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';

import '../../core/errors/failures.dart';
import '../../core/network/mobile_api_gate.dart';
import '../../core/network/network_info.dart';
import '../../domain/entities/sale.dart';
import '../../domain/entities/product.dart';
import '../../domain/repositories/sale_repository.dart';
import '../datasources/local/database/app_database.dart';
import '../datasources/remote/sale_remote_datasource.dart';
import '../models/sale_model.dart';
import '../models/product_variant_model.dart';

final saleRepositoryProvider = Provider<SaleRepository>((ref) {
  return SaleRepositoryImpl(
    remoteDataSource: ref.read(saleRemoteDataSourceProvider),
    database: ref.read(appDatabaseProvider),
    networkInfo: ref.read(networkInfoProvider),
  );
});

List<ProductVariant> _decodeVariants(String? raw, String productId) {
  if (raw == null || raw.isEmpty) return const [];
  try {
    final decoded = jsonDecode(raw);
    if (decoded is! List) return const [];
    return decoded
        .map((item) => ProductVariantModel.tryFromDynamic(item)
            ?.toEntity(parentProductId: productId))
        .whereType<ProductVariant>()
        .toList();
  } catch (_) {
    return const [];
  }
}

class SaleRepositoryImpl implements SaleRepository {
  final SaleRemoteDataSource remoteDataSource;
  final AppDatabase database;
  final NetworkInfo networkInfo;

  static const Duration _autoPullInterval = Duration(minutes: 10);
  static DateTime? _lastPullAt;
  static bool _isPulling = false;

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
      return Left(
          DatabaseFailure(message: 'Gagal menyimpan penjualan: $localError'));
    }

    if (await networkInfo.isConnected) {
      // Jangan blokir kasir menunggu server: simpan lokal dulu, push di latar
      // belakang. Bila gagal, transaksi tetap aman dan dicoba lagi nanti.
      unawaited(_pushSingleSale(sale));
    }

    return Right(sale);
  }

  Future<void> _pushSingleSale(Sale sale) async {
    try {
      final payload = _syncPayload(SaleModel.fromEntity(sale));
      await remoteDataSource.createSale(payload);
      await database.saleDao.markSynced([sale.id]);
    } on DioException catch (e) {
      final status = e.response?.statusCode;
      final data = e.response?.data;
      final code =
          data is Map ? (data['code'] ?? data['error'])?.toString() : null;
      final msg =
          data is Map ? (data['message'] ?? data['msg'])?.toString() : null;
      if (status == 403 &&
          (code == 'PLAN_FREE_NO_DB' ||
              msg?.contains('PLAN_FREE_NO_DB') == true)) {
        // Paket free: server tolak simpan ke DB terpusat — tetap simpan lokal, tidak di-sync.
        try {
          await database.saleDao.markSynced([sale.id]);
        } catch (_) {}
      }
      // Gagal push -> tetap tersimpan lokal, akan dicoba sync berikutnya.
    } catch (_) {
      // Gagal push -> tetap tersimpan lokal, akan dicoba sync berikutnya.
    }
  }

  Map<String, dynamic> _syncPayload(SaleModel model) {
    final payload = Map<String, dynamic>.from(model.toJson());
    payload['paidAmount'] = model.paidAmount;
    payload['changeAmount'] = model.changeAmount;
    payload['paymentMethod'] = model.paymentMethod;
    payload['paymentReference'] = model.paymentReference;
    payload['items'] = model.items.map((item) {
      final json = Map<String, dynamic>.from(item.toJson());
      json['priceOverride'] = json.remove('priceOverridden') ?? false;
      return json;
    }).toList();
    return payload;
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
            variantId: Value(item.variantId),
            variantName: Value(item.variantName),
            name: Value(item.name),
            sku: Value(item.sku),
            price: Value(item.price),
            qty: Value(item.qty),
            lineTotal: Value(item.lineTotal),
            priceOverridden: Value(item.priceOverridden),
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
          final variants = _decodeVariants(product.variantsJson, product.id);
          final updatedVariants = variants.map((variant) {
            if (item.variantId == null || variant.id != item.variantId) {
              return variant;
            }
            return ProductVariant(
              id: variant.id,
              productId: variant.productId,
              sku: variant.sku,
              name: variant.name,
              barcode: variant.barcode,
              qrCode: variant.qrCode,
              price: variant.price,
              stock: (variant.stock - item.qty).round().clamp(0, 1 << 31),
            );
          }).toList();
          await database.productDao.upsertProduct(
            ProductsTableCompanion(
              id: Value(item.productId),
              stock:
                  Value((product.stock - item.qty.round()).clamp(0, 1 << 31)),
              variantsJson: Value(jsonEncode(
                updatedVariants
                    .map((v) =>
                        ProductVariantModel.fromEntity(v, productId: product.id)
                            .toJson())
                    .toList(),
              )),
            ),
          );
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
                    variantId: i.variantId,
                    variantName: i.variantName,
                    name: i.name,
                    sku: i.sku,
                    qty: i.qty,
                    price: i.price,
                    lineTotal: i.lineTotal,
                    priceOverridden: i.priceOverridden,
                  ))
              .toList(),
        );
        final payload = _syncPayload(model);
        await remoteDataSource.createSale(payload);
        await database.saleDao.markSynced([row.id]);
      } on DioException catch (e) {
        final status = e.response?.statusCode;
        final data = e.response?.data;
        final code =
            data is Map ? (data['code'] ?? data['error'])?.toString() : null;
        final msg =
            data is Map ? (data['message'] ?? data['msg'])?.toString() : null;
        final isPlanFree = status == 403 &&
            (code == 'PLAN_FREE_NO_DB' ||
                msg?.contains('PLAN_FREE_NO_DB') == true);
        if (isPlanFree) {
          try {
            await database.saleDao.markSynced([row.id]);
          } catch (_) {}
          continue;
        }
        if (e.response?.statusCode == 400) {
          await database.saleDao.markSynced([row.id]);
          continue;
        }
        if (e.response?.statusCode == 404 || e.response?.statusCode == 501) {
          MobileApiGate.disable('sales');
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
  Future<void> _syncFromServer({bool force = false}) async {
    if (!force &&
        _lastPullAt != null &&
        DateTime.now().difference(_lastPullAt!) < _autoPullInterval) {
      return;
    }
    if (_isPulling) return;
    if (!await networkInfo.isConnected) return;
    if (MobileApiGate.isDisabled('sales')) return;

    _isPulling = true;
    try {
      await _pushPendingSales();

      final knownInvoices =
          (await database.saleDao.getInvoiceNumbers()).toSet();
      var page = 1;
      while (true) {
        final remote = await remoteDataSource.getSales(page: page, limit: 100);
        if (remote.isEmpty) break;

        final fresh = remote
            .where((model) => !knownInvoices.contains(model.invoiceNo))
            .toList();
        if (fresh.isNotEmpty) {
          await database.transaction(() async {
            for (final model in fresh) {
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
                    variantId: Value(item.variantId),
                    variantName: Value(item.variantName),
                    name: Value(item.name),
                    sku: Value(item.sku),
                    price: Value(item.price),
                    qty: Value(item.qty),
                    lineTotal: Value(item.lineTotal),
                    priceOverridden: Value(item.priceOverridden),
                  ),
                );
              }
              await database.paymentDao.upsertPayment(
                PaymentsTableCompanion(
                  id: Value('pay-${model.id}'),
                  saleId: Value(model.id),
                  method: Value(model.paymentMethod),
                  amount: Value(model.total),
                  receivedAmount: Value(model.paidAmount),
                  changeAmount: Value(model.changeAmount),
                  reference: Value(model.paymentReference),
                  createdAt: Value(model.createdAt),
                ),
              );
              knownInvoices.add(model.invoiceNo);
            }
          });
        }

        if (remote.length < 100) break;
        page += 1;
        if (page > 100) break;
      }
      _lastPullAt = DateTime.now();
    } on DioException catch (e) {
      if (e.response?.statusCode == 404 || e.response?.statusCode == 501) {
        MobileApiGate.disable('sales');
      }
    } catch (_) {
      // Offline / gangguan lain -> tetap pakai SQLite lokal.
    } finally {
      _isPulling = false;
    }
  }

  @override
  Future<Either<Failure, Sale>> getSale(String id) async {
    try {
      final sale = await database.saleDao.getById(id);
      if (sale == null)
        return const Left(
            DatabaseFailure(message: 'Penjualan tidak ditemukan'));
      final items = await database.saleDao.getItems(id);
      return Right(await _toEntity(sale, items));
    } catch (e) {
      return const Left(
          DatabaseFailure(message: 'Gagal mengambil data penjualan'));
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
      // Tampilkan data lokal segera; sinkronisasi berjalan di latar belakang
      // (throttled) agar layar transaksi/riwayat tidak menunggu jaringan.
      unawaited(_syncFromServer());

      final sales = await database.saleDao.getAll(
        search: search,
        startDate: startDate,
        endDate: endDate,
        paymentMethod: paymentMethod,
      );
      if (sales.isEmpty) return const Right([]);

      final ids = sales.map((s) => s.id).toList();
      final items = await database.saleDao.getItemsForSales(ids);
      final payments = await database.paymentDao.getBySaleIds(ids);
      final customers = await database.customerDao.getAll();

      final itemsBySale = <String, List<SaleItemsTableData>>{};
      for (final item in items) {
        itemsBySale.putIfAbsent(item.saleId, () => []).add(item);
      }
      final paymentBySale = <String, PaymentsTableData>{};
      for (final payment in payments) {
        paymentBySale.putIfAbsent(payment.saleId, () => payment);
      }
      final customerNames = <String, String>{
        for (final c in customers) c.id: c.name,
      };

      final result = sales.map((sale) {
        return _toSaleEntity(
          sale,
          itemsBySale[sale.id] ?? const [],
          payment: paymentBySale[sale.id],
          customerName:
              sale.customerId == null ? null : customerNames[sale.customerId],
        );
      }).toList();
      return Right(result);
    } catch (e) {
      return const Left(
          DatabaseFailure(message: 'Gagal mengambil data penjualan'));
    }
  }

  Sale _toSaleEntity(
    SalesTableData d,
    List<SaleItemsTableData> items, {
    PaymentsTableData? payment,
    String? customerName,
  }) {
    var paymentMethod = 'cash';
    var paidAmount = d.total;
    var changeAmount = 0.0;
    String? paymentReference;
    if (payment != null) {
      paymentMethod = payment.method;
      paidAmount = payment.receivedAmount;
      changeAmount = payment.changeAmount;
      paymentReference = payment.reference;
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

  Future<Sale> _toEntity(
      SalesTableData d, List<SaleItemsTableData> items) async {
    String? customerName;
    if (d.customerId != null) {
      final customer = await database.customerDao.getById(d.customerId!);
      customerName = customer?.name;
    }

    final payments = await database.paymentDao.getBySaleId(d.id);
    return _toSaleEntity(
      d,
      items,
      payment: payments.isNotEmpty ? payments.first : null,
      customerName: customerName,
    );
  }

  SaleItem _toSaleItemEntity(SaleItemsTableData i) {
    return SaleItem(
      id: i.id,
      saleId: i.saleId,
      productId: i.productId,
      variantId: i.variantId,
      variantName: i.variantName,
      name: i.name,
      sku: i.sku,
      qty: i.qty,
      price: i.price,
      lineTotal: i.lineTotal,
      priceOverridden: i.priceOverridden,
    );
  }
}

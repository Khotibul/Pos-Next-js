import 'dart:async';
import 'dart:convert';

import 'package:dartz/dartz.dart';
import 'package:dio/dio.dart' show DioException;
import 'package:drift/drift.dart' show Value;
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/errors/failures.dart';
import '../../core/network/mobile_api_gate.dart';
import '../../core/network/network_info.dart';
import '../../domain/entities/product.dart';
import '../../domain/repositories/product_repository.dart';
import '../datasources/local/database/app_database.dart';
import '../datasources/remote/product_remote_datasource.dart';
import '../models/product_model.dart';
import '../models/product_variant_model.dart';

final productRepositoryProvider = Provider<ProductRepository>((ref) {
  return ProductRepositoryImpl(
    remoteDataSource: ref.read(productRemoteDataSourceProvider),
    database: ref.read(appDatabaseProvider),
    networkInfo: ref.read(networkInfoProvider),
  );
});

List<ProductVariant> _parseVariants(String? raw, String productId) {
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

class ProductRepositoryImpl implements ProductRepository {
  final ProductRemoteDataSource remoteDataSource;
  final AppDatabase database;
  final NetworkInfo networkInfo;

  static const int _pullPageSize = 500;
  static const Duration _autoPullInterval = Duration(minutes: 10);
  static DateTime? _lastPullAt;
  static bool _isPulling = false;

  ProductRepositoryImpl({
    required this.remoteDataSource,
    required this.database,
    required this.networkInfo,
  });

  /// Dorong produk lokal yang belum tersinkron (dibuat/diubah offline).
  Future<void> _pushPendingProducts() async {
    final pending = await database.productDao.getUnsynced();
    for (final row in pending) {
      try {
        final model = ProductModel(
          id: row.id,
          sku: row.sku,
          slug: row.slug,
          name: row.name,
          description: row.description,
          barcode: row.barcode,
          qrCode: row.qrCode,
          categoryId: row.categoryId,
          brandId: row.brandId,
          brandName: row.brandName,
          supplierId: row.supplierId,
          unitId: row.unitId,
          costPrice: row.costPrice,
          sellingPrice: row.sellingPrice,
          marginPct: row.marginPct,
          taxRate: row.taxRate,
          weight: row.weight,
          volume: row.volume,
          minStock: row.minStock,
          reorderPoint: row.reorderPoint,
          wholesalePrice: row.wholesalePrice,
          wholesaleDiscountPercent: row.wholesaleDiscountPercent,
          wholesaleMinQty: row.wholesaleMinQty,
          isActive: row.isActive,
          isFeatured: row.isFeatured,
          isConsignment: row.isConsignment,
          type: row.type,
          stock: row.stock,
          unit: row.unit,
          imageUrl: row.imageUrl,
          variants: _parseVariants(row.variantsJson, row.id)
              .map((v) => ProductVariantModel.fromEntity(v, productId: row.id))
              .toList(),
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        );
        await remoteDataSource.createProduct(model.toJson());
        await database.productDao.markSynced([row.id]);
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
            await database.productDao.markSynced([row.id]);
          } catch (_) {}
          continue;
        }
        if (e.response?.statusCode == 400) {
          await database.productDao.markSynced([row.id]);
          continue;
        }
        if (e.response?.statusCode == 404 || e.response?.statusCode == 501) {
          MobileApiGate.disable('products');
        }
        break; // koneksi bermasalah -> sync berikutnya
      } catch (_) {
        break;
      }
    }
  }

  Future<void> _syncFromServer({bool force = false}) async {
    if (!force &&
        _lastPullAt != null &&
        DateTime.now().difference(_lastPullAt!) < _autoPullInterval) {
      return;
    }
    if (_isPulling) return;
    if (!await networkInfo.isConnected) return;
    if (MobileApiGate.isDisabled('products')) return;

    _isPulling = true;
    try {
      await _pushPendingProducts();

      // Tarik SEMUA halaman produk (bukan hanya 500 pertama).
      var page = 1;
      while (true) {
        final remote = await remoteDataSource.getProducts(
          page: page,
          limit: _pullPageSize,
        );
        if (remote.isEmpty) break;

        await database.productDao.upsertProducts(
          remote.map((model) => _toCompanion(model)).toList(),
        );

        if (remote.length < _pullPageSize) break;
        page += 1;
        // Guard agar tidak infinite loop bila server mengabaikan `page`.
        if (page > 400) break;
      }
      _lastPullAt = DateTime.now();
    } on DioException catch (e) {
      if (e.response?.statusCode == 404 || e.response?.statusCode == 501) {
        MobileApiGate.disable('products');
      }
    } catch (_) {
      // Offline / gangguan lain -> tetap pakai SQLite lokal.
    } finally {
      _isPulling = false;
    }
  }

  ProductsTableCompanion _toCompanion(ProductModel model,
      {bool isSynced = true}) {
    return ProductsTableCompanion(
      id: Value(model.id),
      sku: Value(model.sku),
      slug: Value(model.slug),
      name: Value(model.name),
      description: Value(model.description),
      barcode: Value(model.barcode),
      qrCode: Value(model.qrCode),
      categoryId: Value(model.categoryId),
      brandId: Value(model.brandId),
      brandName: Value(model.brandName),
      supplierId: Value(model.supplierId),
      unitId: Value(model.unitId),
      costPrice: Value(model.costPrice),
      sellingPrice: Value(model.sellingPrice),
      marginPct: Value(model.marginPct),
      taxRate: Value(model.taxRate),
      weight: Value(model.weight),
      volume: Value(model.volume),
      minStock: Value(model.minStock),
      reorderPoint: Value(model.reorderPoint),
      wholesalePrice: Value(model.wholesalePrice),
      wholesaleDiscountPercent: Value(model.wholesaleDiscountPercent),
      wholesaleMinQty: Value(model.wholesaleMinQty),
      isActive: Value(model.isActive),
      isFeatured: Value(model.isFeatured),
      isConsignment: Value(model.isConsignment),
      type: Value(model.type),
      stock: Value(model.stock),
      unit: Value(model.unit),
      imageUrl: Value(model.imageUrl),
      variantsJson:
          Value(jsonEncode(model.variants.map((v) => v.toJson()).toList())),
      isSynced: Value(isSynced),
      createdAt: Value(model.createdAt),
      updatedAt: Value(model.updatedAt),
    );
  }

  @override
  Future<Either<Failure, int>> syncProducts({bool force = false}) async {
    if (!await networkInfo.isConnected) {
      return const Left(NetworkFailure(message: 'Tidak ada koneksi internet'));
    }
    await _syncFromServer(force: force);
    try {
      return Right(await database.productDao.getCount());
    } catch (_) {
      return const Right(0);
    }
  }

  @override
  Future<Either<Failure, Product>> createProduct(Product product) async {
    var pushed = false;
    try {
      final model = ProductModel.fromEntity(product);
      await remoteDataSource.createProduct(model.toJson());
      pushed = true;
    } catch (e) {
      pushed = false;
      // Offline / endpoint gagal / PLAN_FREE_NO_DB -> tetap simpan lokal, nanti di-push sync.
    }

    try {
      await _saveLocally(product, synced: pushed);
      return Right(product);
    } catch (localError) {
      return Left(
          DatabaseFailure(message: 'Gagal membuat produk: $localError'));
    }
  }

  Future<void> _saveLocally(Product p, {bool synced = false}) async {
    await database.productDao.upsertProduct(
      _localCompanion(p, synced: synced),
    );
  }

  ProductsTableCompanion _localCompanion(Product p, {bool synced = false}) {
    return ProductsTableCompanion(
      id: Value(p.id),
      isSynced: Value(synced),
      sku: Value(p.sku),
      slug: Value(p.slug),
      name: Value(p.name),
      barcode: Value(p.barcode),
      qrCode: Value(p.qrCode),
      description: Value(p.description),
      categoryId: Value(p.categoryId),
      brandId: Value(p.brandId),
      brandName: Value(p.brandName),
      supplierId: Value(p.supplierId),
      unitId: Value(p.unitId),
      costPrice: Value(p.costPrice),
      sellingPrice: Value(p.sellingPrice),
      marginPct: Value(p.marginPct),
      taxRate: Value(p.taxRate),
      weight: Value(p.weight),
      volume: Value(p.volume),
      minStock: Value(p.minStock),
      reorderPoint: Value(p.reorderPoint),
      wholesalePrice: Value(p.wholesalePrice),
      wholesaleDiscountPercent: Value(p.wholesaleDiscountPercent),
      wholesaleMinQty: Value(p.wholesaleMinQty),
      isActive: Value(p.isActive),
      isFeatured: Value(p.isFeatured),
      isConsignment: Value(p.isConsignment),
      type: Value(p.type),
      stock: Value(p.stock),
      unit: Value(p.unit),
      imageUrl: Value(p.imageUrl),
      variantsJson: Value(jsonEncode(p.variants
          .map((v) =>
              ProductVariantModel.fromEntity(v, productId: p.id).toJson())
          .toList())),
    );
  }

  @override
  Future<Either<Failure, int>> importProducts(List<Product> products) async {
    if (products.isEmpty) return const Right(0);
    try {
      await database.productDao.upsertProducts(
        products.map((p) => _localCompanion(p, synced: false)).toList(),
      );
      // Push ke server di latar belakang supaya UI tidak menunggu ratusan
      // request HTTP (atau timeout saat offline).
      if (await networkInfo.isConnected) {
        unawaited(_syncFromServer(force: true));
      }
      return Right(products.length);
    } catch (e) {
      return Left(DatabaseFailure(message: 'Gagal import produk: $e'));
    }
  }

  @override
  Future<Either<Failure, void>> deleteProduct(String id) async {
    // Hapus lokal selalu; remote best-effort (tanpa tombstone).
    try {
      await database.productDao.deleteProduct(id);
    } catch (_) {}
    try {
      await remoteDataSource.deleteProduct(id);
    } catch (_) {}
    return const Right(null);
  }

  @override
  Future<Either<Failure, Product>> getProduct(String id) async {
    try {
      final row = await database.productDao.getById(id);
      if (row == null) {
        final product = await remoteDataSource.getProduct(id);
        return Right(product.toEntity());
      }
      return Right(await _toEntity(row));
    } catch (e) {
      return Left(DatabaseFailure(message: 'Gagal mendapatkan produk: $e'));
    }
  }

  @override
  Future<Either<Failure, Product>> getProductByBarcode(String barcode) async {
    try {
      final row = await database.productDao.getByBarcode(barcode);
      if (row != null) return Right(await _toEntity(row));
      final product = await remoteDataSource.getProductByBarcode(barcode);
      return Right(product.toEntity());
    } catch (e) {
      return Left(DatabaseFailure(
          message: 'Produk dengan barcode $barcode tidak ditemukan'));
    }
  }

  @override
  Future<Either<Failure, List<Product>>> getProducts({
    int page = 1,
    int limit = 20,
    String? search,
    String? categoryId,
    bool? activeOnly,
  }) async {
    try {
      // Baca SQLite lokal saja — sinkronisasi dilakukan scheduler/manual
      // supaya daftar produk & kasir tetap instan saat transaksi.
      final rows = await database.productDao.getAll(
        search: search,
        categoryId: categoryId,
      );
      return Right(await _toEntities(rows));
    } catch (e) {
      return const Left(
          DatabaseFailure(message: 'Gagal mengambil data produk'));
    }
  }

  @override
  Future<Either<Failure, List<Product>>> searchProducts(String query) async {
    try {
      final results = await database.productDao.search(query);
      return Right(await _toEntities(results));
    } catch (e) {
      return const Left(DatabaseFailure(message: 'Gagal mencari produk'));
    }
  }

  @override
  Future<Either<Failure, Product>> updateProduct(Product product) async {
    var pushed = false;
    try {
      final model = ProductModel.fromEntity(product);
      await remoteDataSource.createProduct(model.toJson());
      pushed = true;
    } catch (_) {
      pushed = false;
    }

    try {
      await database.productDao.upsertProduct(
        ProductsTableCompanion(
          id: Value(product.id),
          sku: Value(product.sku),
          slug: Value(product.slug),
          name: Value(product.name),
          barcode: Value(product.barcode),
          qrCode: Value(product.qrCode),
          description: Value(product.description),
          categoryId: Value(product.categoryId),
          brandId: Value(product.brandId),
          brandName: Value(product.brandName),
          supplierId: Value(product.supplierId),
          unitId: Value(product.unitId),
          costPrice: Value(product.costPrice),
          sellingPrice: Value(product.sellingPrice),
          marginPct: Value(product.marginPct),
          taxRate: Value(product.taxRate),
          weight: Value(product.weight),
          volume: Value(product.volume),
          minStock: Value(product.minStock),
          reorderPoint: Value(product.reorderPoint),
          wholesalePrice: Value(product.wholesalePrice),
          wholesaleDiscountPercent: Value(product.wholesaleDiscountPercent),
          wholesaleMinQty: Value(product.wholesaleMinQty),
          isActive: Value(product.isActive),
          isFeatured: Value(product.isFeatured),
          isConsignment: Value(product.isConsignment),
          type: Value(product.type),
          stock: Value(product.stock),
          unit: Value(product.unit),
          imageUrl: Value(product.imageUrl),
          variantsJson: Value(jsonEncode(product.variants
              .map((v) =>
                  ProductVariantModel.fromEntity(v, productId: product.id)
                      .toJson())
              .toList())),
          isSynced: Value(pushed),
          updatedAt: Value(DateTime.now()),
        ),
      );
      return Right(product);
    } catch (localError) {
      return Left(DatabaseFailure(message: 'Gagal update produk: $localError'));
    }
  }

  @override
  Future<Either<Failure, List<Product>>> getLowStockProducts() async {
    try {
      final products = await database.productDao.getLowStock();
      return Right(await _toEntities(products));
    } catch (e) {
      return const Left(
          DatabaseFailure(message: 'Gagal mengambil produk stok rendah'));
    }
  }

  @override
  Future<Either<Failure, void>> updateStock(
      String productId, int quantity) async {
    try {
      await database.productDao.updateStock(productId, quantity);
      return const Right(null);
    } catch (e) {
      return const Left(DatabaseFailure(message: 'Gagal mengupdate stok'));
    }
  }

  Future<void> _refreshProductCache(String productId) async {
    final model = await remoteDataSource.getProduct(productId);
    await database.productDao.upsertProduct(_toCompanion(model));
  }

  String _apiErrorMessage(Object error, String fallback) {
    if (error is DioException) {
      final data = error.response?.data;
      if (data is Map) {
        final message = data['message'] ?? data['msg'];
        if (message != null && message.toString().isNotEmpty) {
          return message.toString();
        }
      }
    }
    return fallback;
  }

  @override
  Future<Either<Failure, List<ProductVariant>>> getProductVariants(
    String productId,
  ) async {
    try {
      final remote = await remoteDataSource.getVariants(productId);
      try {
        await _refreshProductCache(productId);
      } catch (_) {}
      return Right(
        remote.map((v) => v.toEntity(parentProductId: productId)).toList(),
      );
    } catch (error) {
      try {
        final row = await database.productDao.getById(productId);
        if (row != null) {
          return Right(_parseVariants(row.variantsJson, productId));
        }
      } catch (_) {}
      return Left(ServerFailure(
        message: _apiErrorMessage(error, 'Gagal mengambil varian produk'),
      ));
    }
  }

  @override
  Future<Either<Failure, void>> upsertProductVariant(
    String productId, {
    String? variantId,
    required String name,
    String? sku,
    String? barcode,
    String? qrCode,
    double price = 0,
    int stock = 0,
  }) async {
    final trimmedSku = (sku ?? '').trim();
    final payload = <String, dynamic>{
      'name': name,
      'barcode': barcode,
      'qrCode': qrCode,
      'costPrice': 0,
      'sellingPrice': price,
      'isActive': true,
      'stock': stock,
    };
    if (variantId == null || trimmedSku.isNotEmpty) {
      payload['sku'] = trimmedSku;
    }
    try {
      if (variantId == null) {
        await remoteDataSource.createVariant(productId, payload);
      } else {
        await remoteDataSource.updateVariant(productId, variantId, payload);
      }
      try {
        await _refreshProductCache(productId);
      } catch (_) {}
      return const Right(null);
    } catch (error) {
      return Left(ServerFailure(
        message: _apiErrorMessage(error, 'Gagal menyimpan varian produk'),
      ));
    }
  }

  @override
  Future<Either<Failure, void>> deleteProductVariant(
    String productId,
    String variantId,
  ) async {
    try {
      await remoteDataSource.deleteVariant(productId, variantId);
      try {
        await _refreshProductCache(productId);
      } catch (_) {}
      return const Right(null);
    } catch (error) {
      return Left(ServerFailure(
        message: _apiErrorMessage(error, 'Gagal menghapus varian produk'),
      ));
    }
  }

  Future<List<Product>> _toEntities(List<ProductsTableData> rows) async {
    if (rows.isEmpty) return const [];

    // Hindari N+1 query: ambil semua nama kategori/supplier sekali saja.
    final categories = await database.categoryDao.getAll();
    final suppliers = await database.supplierDao.getAll();
    final categoryNames = <String, String>{
      for (final c in categories) c.id: c.name,
    };
    final supplierNames = <String, String>{
      for (final s in suppliers) s.id: s.name,
    };

    return rows.map((p) {
      return Product(
        id: p.id,
        sku: p.sku,
        slug: p.slug,
        barcode: p.barcode,
        qrCode: p.qrCode,
        name: p.name,
        description: p.description,
        categoryId: p.categoryId,
        categoryName: p.categoryId == null ? null : categoryNames[p.categoryId],
        brandId: p.brandId,
        brandName: p.brandName,
        supplierId: p.supplierId,
        supplierName: p.supplierId == null ? null : supplierNames[p.supplierId],
        unitId: p.unitId,
        costPrice: p.costPrice,
        sellingPrice: p.sellingPrice,
        marginPct: p.marginPct,
        taxRate: p.taxRate,
        weight: p.weight,
        volume: p.volume,
        minStock: p.minStock,
        reorderPoint: p.reorderPoint,
        wholesalePrice: p.wholesalePrice,
        wholesaleDiscountPercent: p.wholesaleDiscountPercent,
        wholesaleMinQty: p.wholesaleMinQty,
        isActive: p.isActive,
        isFeatured: p.isFeatured,
        isConsignment: p.isConsignment,
        type: p.type,
        stock: p.stock,
        unit: p.unit,
        imageUrl: p.imageUrl,
        variants: _parseVariants(p.variantsJson, p.id),
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      );
    }).toList();
  }

  Future<Product> _toEntity(ProductsTableData p) async {
    final entities = await _toEntities([p]);
    return entities.first;
  }
}

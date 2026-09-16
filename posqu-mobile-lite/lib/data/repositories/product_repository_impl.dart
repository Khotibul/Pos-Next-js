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

final productRepositoryProvider = Provider<ProductRepository>((ref) {
  return ProductRepositoryImpl(
    remoteDataSource: ref.read(productRemoteDataSourceProvider),
    database: ref.read(appDatabaseProvider),
    networkInfo: ref.read(networkInfoProvider),
  );
});

class ProductRepositoryImpl implements ProductRepository {
  final ProductRemoteDataSource remoteDataSource;
  final AppDatabase database;
  final NetworkInfo networkInfo;

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
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        );
        await remoteDataSource.createProduct(model.toJson());
        await database.productDao.markSynced([row.id]);
      } on DioException catch (e) {
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

  Future<void> _syncFromServer() async {
    if (!await networkInfo.isConnected) return;
    if (MobileApiGate.isDisabled('products')) return;

    await _pushPendingProducts();

    try {
      final remote = await remoteDataSource.getProducts(limit: 500);
      for (final model in remote) {
        await database.productDao.upsertProduct(
          ProductsTableCompanion(
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
            isSynced: const Value(true),
          ),
        );
      }
    } on DioException catch (e) {
      if (e.response?.statusCode == 404 || e.response?.statusCode == 501) {
        MobileApiGate.disable('products');
      }
    } catch (_) {
      // Offline / gangguan lain -> tetap pakai SQLite lokal.
    }
  }

  @override
  Future<Either<Failure, Product>> createProduct(Product product) async {
    var pushed = false;
    try {
      final model = ProductModel.fromEntity(product);
      await remoteDataSource.createProduct(model.toJson());
      pushed = true;
    } catch (_) {
      // Offline / endpoint gagal -> tetap simpan lokal, nanti di-push sync.
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
      ProductsTableCompanion(
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
      ),
    );
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
      await _syncFromServer();
      final rows = await database.productDao.getAll(
        search: search,
        categoryId: categoryId,
      );
      final entities = <Product>[];
      for (final row in rows) {
        entities.add(await _toEntity(row));
      }
      return Right(entities);
    } catch (e) {
      return const Left(DatabaseFailure(message: 'Gagal mengambil data produk'));
    }
  }

  @override
  Future<Either<Failure, List<Product>>> searchProducts(String query) async {
    try {
      final results = await database.productDao.search(query);
      final entities = <Product>[];
      for (final row in results) {
        entities.add(await _toEntity(row));
      }
      return Right(entities);
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
    } catch (_) {}

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
      final entities = <Product>[];
      for (final row in products) {
        entities.add(await _toEntity(row));
      }
      return Right(entities);
    } catch (e) {
      return const Left(DatabaseFailure(message: 'Gagal mengambil produk stok rendah'));
    }
  }

  @override
  Future<Either<Failure, void>> updateStock(String productId, int quantity) async {
    try {
      await database.productDao.updateStock(productId, quantity);
      return const Right(null);
    } catch (e) {
      return const Left(DatabaseFailure(message: 'Gagal mengupdate stok'));
    }
  }

  Future<Product> _toEntity(ProductsTableData p) async {
    String? categoryName;
    if (p.categoryId != null) {
      final category = await database.categoryDao.getById(p.categoryId!);
      categoryName = category?.name;
    }
    String? supplierName;
    if (p.supplierId != null) {
      final supplier = await database.supplierDao.getById(p.supplierId!);
      supplierName = supplier?.name;
    }
    return Product(
      id: p.id,
      sku: p.sku,
      slug: p.slug,
      barcode: p.barcode,
      qrCode: p.qrCode,
      name: p.name,
      description: p.description,
      categoryId: p.categoryId,
      categoryName: categoryName,
      brandId: p.brandId,
      brandName: p.brandName,
      supplierId: p.supplierId,
      supplierName: supplierName,
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
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    );
  }
}

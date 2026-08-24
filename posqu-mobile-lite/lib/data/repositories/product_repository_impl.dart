import 'package:dartz/dartz.dart';
import 'package:drift/drift.dart' show Value;
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/errors/failures.dart';
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

  Future<void> _syncFromServer() async {
    if (!await networkInfo.isConnected) return;
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
            supplierId: Value(model.supplierId),
            unitId: Value(model.unitId),
            costPrice: Value(model.costPrice),
            sellingPrice: Value(model.sellingPrice),
            marginPct: Value(model.marginPct),
            taxRate: Value(model.taxRate),
            minStock: Value(model.minStock),
            reorderPoint: Value(model.reorderPoint),
            wholesalePrice: Value(model.wholesalePrice),
            wholesaleDiscountPercent: Value(model.wholesaleDiscountPercent),
            wholesaleMinQty: Value(model.wholesaleMinQty),
            isActive: Value(model.isActive),
            isFeatured: Value(model.isFeatured),
            isConsignment: Value(model.isConsignment),
            type: Value(model.type),
            unit: Value(model.unit),
            imageUrl: Value(model.imageUrl),
          ),
        );
      }
    } catch (_) {
      // Server tidak tersedia / endpoint belum ada -> tetap pakai SQLite lokal.
    }
  }

  @override
  Future<Either<Failure, Product>> createProduct(Product product) async {
    try {
      final model = ProductModel.fromEntity(product);
      final created = await remoteDataSource.createProduct(model.toJson());
      return Right(created.toEntity());
    } catch (e) {
      try {
        await _saveLocally(product);
        return Right(product);
      } catch (localError) {
        return Left(DatabaseFailure(message: 'Gagal membuat produk: $e'));
      }
    }
  }

  Future<void> _saveLocally(Product p) async {
    await database.productDao.insertProduct(
      ProductsTableCompanion(
        id: Value(p.id),
        sku: Value(p.sku),
        name: Value(p.name),
        barcode: Value(p.barcode),
        description: Value(p.description),
        categoryId: Value(p.categoryId),
        supplierId: Value(p.supplierId),
        costPrice: Value(p.costPrice),
        sellingPrice: Value(p.sellingPrice),
        wholesalePrice: Value(p.wholesalePrice),
        stock: Value(p.stock),
        minStock: Value(p.minStock),
        unit: Value(p.unit),
        imageUrl: Value(p.imageUrl),
        isActive: Value(p.isActive),
      ),
    );
  }

  @override
  Future<Either<Failure, void>> deleteProduct(String id) async {
    try {
      await remoteDataSource.deleteProduct(id);
      return const Right(null);
    } catch (e) {
      try {
        await database.productDao.deleteProduct(id);
        return const Right(null);
      } catch (localError) {
        return Left(ServerFailure(message: 'Gagal menghapus produk: $e'));
      }
    }
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
    try {
      final model = ProductModel.fromEntity(product);
      final updated = await remoteDataSource.updateProduct(product.id, model.toJson());
      return Right(updated.toEntity());
    } catch (e) {
      try {
        await database.productDao.updateProduct(
          ProductsTableCompanion(
            id: Value(product.id),
            sku: Value(product.sku),
            name: Value(product.name),
            barcode: Value(product.barcode),
            description: Value(product.description),
            categoryId: Value(product.categoryId),
            supplierId: Value(product.supplierId),
            costPrice: Value(product.costPrice),
            sellingPrice: Value(product.sellingPrice),
            wholesalePrice: Value(product.wholesalePrice),
            stock: Value(product.stock),
            minStock: Value(product.minStock),
            unit: Value(product.unit),
            imageUrl: Value(product.imageUrl),
            isActive: Value(product.isActive),
          ),
        );
        return Right(product);
      } catch (localError) {
        return Left(ServerFailure(message: 'Gagal update produk: $e'));
      }
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
      supplierId: p.supplierId,
      supplierName: null,
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

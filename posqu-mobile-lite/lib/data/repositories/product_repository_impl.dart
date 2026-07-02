import 'package:dartz/dartz.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/errors/failures.dart';
import '../../domain/entities/product.dart';
import '../../domain/repositories/product_repository.dart';
import '../datasources/local/database/app_database.dart';
import '../datasources/remote/product_remote_datasource.dart';
import '../models/product_model.dart';

final productRepositoryProvider = Provider<ProductRepository>((ref) {
  return ProductRepositoryImpl(
    remoteDataSource: ref.read(productRemoteDataSourceProvider),
    database: ref.read(appDatabaseProvider),
  );
});

class ProductRepositoryImpl implements ProductRepository {
  final ProductRemoteDataSource remoteDataSource;
  final AppDatabase database;

  ProductRepositoryImpl({
    required this.remoteDataSource,
    required this.database,
  });

  @override
  Future<Either<Failure, Product>> createProduct(Product product) async {
    try {
      final model = ProductModel.fromEntity(product);
      final created = await remoteDataSource.createProduct(model.toJson());
      return Right(created.toEntity());
    } catch (e) {
      return Left(ServerFailure(message: 'Gagal membuat produk: $e'));
    }
  }

  @override
  Future<Either<Failure, void>> deleteProduct(int id) async {
    try {
      await remoteDataSource.deleteProduct(id);
      return const Right(null);
    } catch (e) {
      return Left(ServerFailure(message: 'Gagal menghapus produk: $e'));
    }
  }

  @override
  Future<Either<Failure, Product>> getProduct(int id) async {
    try {
      final product = await remoteDataSource.getProduct(id);
      return Right(product.toEntity());
    } catch (e) {
      return Left(ServerFailure(message: 'Gagal mendapatkan produk: $e'));
    }
  }

  @override
  Future<Either<Failure, Product>> getProductByBarcode(String barcode) async {
    try {
      final product = await remoteDataSource.getProductByBarcode(barcode);
      return Right(product.toEntity());
    } catch (e) {
      return Left(ServerFailure(message: 'Produk dengan barcode $barcode tidak ditemukan'));
    }
  }

  @override
  Future<Either<Failure, List<Product>>> getProducts({
    int page = 1,
    int limit = 20,
    String? search,
    int? categoryId,
    bool? activeOnly,
  }) async {
    try {
      final products = await remoteDataSource.getProducts(
        page: page,
        limit: limit,
        search: search,
        categoryId: categoryId,
      );
      return Right(products.map((e) => e.toEntity()).toList());
    } catch (e) {
      return const Left(ServerFailure(message: 'Gagal mengambil data produk'));
    }
  }

  @override
  Future<Either<Failure, List<Product>>> searchProducts(String query) async {
    try {
      final results = await database.productDao.search(query);
      return Right(results.map((e) => _toEntity(e)).toList());
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
      return Left(ServerFailure(message: 'Gagal mengupdate produk: $e'));
    }
  }

  @override
  Future<Either<Failure, List<Product>>> getLowStockProducts() async {
    try {
      final products = await database.productDao.getLowStock();
      return Right(products.map((e) => _toEntity(e)).toList());
    } catch (e) {
      return const Left(DatabaseFailure(message: 'Gagal mengambil produk stok rendah'));
    }
  }

  @override
  Future<Either<Failure, void>> updateStock(int productId, int quantity) async {
    try {
      await database.productDao.updateStock(productId, quantity);
      return const Right(null);
    } catch (e) {
      return const Left(DatabaseFailure(message: 'Gagal mengupdate stok'));
    }
  }

  Product _toEntity(ProductsTableData p) {
    return Product(
      id: p.id,
      code: p.code,
      barcode: p.barcode,
      name: p.name,
      description: p.description,
      categoryId: p.categoryId,
      categoryName: null,
      supplierId: p.supplierId,
      supplierName: null,
      purchasePrice: p.purchasePrice,
      sellingPrice: p.sellingPrice,
      wholesalePrice: p.wholesalePrice,
      stock: p.stock,
      minStock: p.minStock,
      unit: p.unit,
      imageUrl: p.imageUrl,
      isActive: p.isActive,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    );
  }
}

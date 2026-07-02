import 'package:dartz/dartz.dart' show Either;

import '../entities/product.dart';
import '../../core/errors/failures.dart';

abstract class ProductRepository {
  Future<Either<Failure, List<Product>>> getProducts({
    int page = 1,
    int limit = 20,
    String? search,
    int? categoryId,
    bool? activeOnly,
  });
  Future<Either<Failure, Product>> getProduct(int id);
  Future<Either<Failure, Product>> getProductByBarcode(String barcode);
  Future<Either<Failure, Product>> createProduct(Product product);
  Future<Either<Failure, Product>> updateProduct(Product product);
  Future<Either<Failure, void>> deleteProduct(int id);
  Future<Either<Failure, List<Product>>> searchProducts(String query);
  Future<Either<Failure, List<Product>>> getLowStockProducts();
  Future<Either<Failure, void>> updateStock(int productId, int quantity);
}

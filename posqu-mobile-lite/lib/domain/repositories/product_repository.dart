import 'package:dartz/dartz.dart' show Either;

import '../entities/product.dart';
import '../../core/errors/failures.dart';

abstract class ProductRepository {
  Future<Either<Failure, List<Product>>> getProducts({
    int page = 1,
    int limit = 20,
    String? search,
    String? categoryId,
    bool? activeOnly,
  });
  Future<Either<Failure, Product>> getProduct(String id);
  Future<Either<Failure, Product>> getProductByBarcode(String barcode);
  Future<Either<Failure, Product>> createProduct(Product product);
  Future<Either<Failure, Product>> updateProduct(Product product);
  Future<Either<Failure, void>> deleteProduct(String id);
  Future<Either<Failure, List<Product>>> searchProducts(String query);
  Future<Either<Failure, List<Product>>> getLowStockProducts();
  Future<Either<Failure, void>> updateStock(String productId, int quantity);
  Future<Either<Failure, int>> syncProducts({bool force = false});
  Future<Either<Failure, int>> importProducts(List<Product> products);
  Future<Either<Failure, List<ProductVariant>>> getProductVariants(
    String productId,
  );
  Future<Either<Failure, void>> upsertProductVariant(
    String productId, {
    String? variantId,
    required String name,
    String? sku,
    String? barcode,
    String? qrCode,
    double price = 0,
    int stock = 0,
  });
  Future<Either<Failure, void>> deleteProductVariant(
    String productId,
    String variantId,
  );
}

import 'package:dartz/dartz.dart' show Either;

import '../entities/purchase.dart';
import '../../core/errors/failures.dart';

abstract class PurchaseRepository {
  Future<Either<Failure, List<Purchase>>> getPurchases({
    int page = 1,
    int limit = 20,
    String? search,
    DateTime? startDate,
    DateTime? endDate,
  });
  Future<Either<Failure, Purchase>> getPurchase(String id);
  Future<Either<Failure, Purchase>> createPurchase(Purchase purchase);
  Future<Either<Failure, void>> deletePurchase(String id);
}

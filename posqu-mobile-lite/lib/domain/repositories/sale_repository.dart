import 'package:dartz/dartz.dart' show Either;

import '../entities/sale.dart';
import '../../core/errors/failures.dart';

abstract class SaleRepository {
  Future<Either<Failure, List<Sale>>> getSales({
    int page = 1,
    int limit = 20,
    String? search,
    DateTime? startDate,
    DateTime? endDate,
    String? paymentMethod,
  });
  Future<Either<Failure, Sale>> getSale(int id);
  Future<Either<Failure, Sale>> getSaleByInvoice(String invoiceNumber);
  Future<Either<Failure, Sale>> createSale(Sale sale);
  Future<Either<Failure, void>> deleteSale(int id);
}

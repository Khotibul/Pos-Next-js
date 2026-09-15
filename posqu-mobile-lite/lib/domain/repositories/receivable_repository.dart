import 'package:dartz/dartz.dart' show Either;
import '../entities/receivable.dart';
import '../../core/errors/failures.dart';

abstract class ReceivableRepository {
  Future<Either<Failure, List<Receivable>>> getReceivables({
    int page = 1,
    int limit = 20,
    String? search,
    String? status,
  });
  Future<Either<Failure, Receivable>> getReceivable(String id);
  Future<Either<Failure, Receivable>> createReceivable(Receivable receivable);
  Future<Either<Failure, void>> createPayment(ReceivablePayment payment);
  Future<Either<Failure, void>> deleteReceivable(String id);
}

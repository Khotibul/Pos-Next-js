import 'package:dartz/dartz.dart' show Either;
import '../entities/payable.dart';
import '../../core/errors/failures.dart';

abstract class PayableRepository {
  Future<Either<Failure, List<Payable>>> getPayables({
    int page = 1,
    int limit = 20,
    String? search,
    String? status,
  });
  Future<Either<Failure, Payable>> getPayable(String id);
  Future<Either<Failure, Payable>> createPayable(Payable payable);
  Future<Either<Failure, void>> createPayment(PayablePayment payment);
  Future<Either<Failure, void>> deletePayable(String id);
}

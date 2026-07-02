import 'package:dartz/dartz.dart' show Either;

import '../entities/cashier_shift.dart';
import '../../core/errors/failures.dart';

abstract class CashRepository {
  Future<Either<Failure, List<CashTransaction>>> getCashTransactions({
    int page = 1,
    int limit = 20,
    DateTime? startDate,
    DateTime? endDate,
    String? type,
  });
  Future<Either<Failure, CashTransaction>> createCashTransaction(CashTransaction transaction);
  Future<Either<Failure, double>> getCashBalance();
}

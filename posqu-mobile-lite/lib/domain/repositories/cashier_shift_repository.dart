import 'package:dartz/dartz.dart' show Either;

import '../entities/cashier_shift.dart';
import '../../core/errors/failures.dart';

abstract class CashierShiftRepository {
  Future<Either<Failure, List<CashierShift>>> getShifts({
    int page = 1,
    int limit = 20,
    DateTime? startDate,
    DateTime? endDate,
  });
  Future<Either<Failure, CashierShift>> getActiveShift(String cashierId);
  Future<Either<Failure, CashierShift>> openShift(CashierShift shift);
  Future<Either<Failure, CashierShift>> closeShift(CashierShift shift);
  Future<Either<Failure, CashierShift>> getShift(String id);
}

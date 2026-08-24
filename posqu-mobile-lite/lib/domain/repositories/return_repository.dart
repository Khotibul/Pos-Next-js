import 'package:dartz/dartz.dart' show Either;

import '../entities/return.dart';
import '../../core/errors/failures.dart';

abstract class ReturnRepository {
  Future<Either<Failure, List<Return>>> getReturns({
    int page = 1,
    int limit = 20,
    String? search,
    DateTime? startDate,
    DateTime? endDate,
    String? type,
  });
  Future<Either<Failure, Return>> getReturn(String id);
  Future<Either<Failure, Return>> createReturn(Return returnData);
}

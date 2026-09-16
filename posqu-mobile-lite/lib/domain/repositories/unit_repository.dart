import 'package:dartz/dartz.dart' show Either;

import '../entities/unit.dart';
import '../../core/errors/failures.dart';

abstract class UnitRepository {
  Future<Either<Failure, List<Unit>>> getUnits();
  Future<Either<Failure, Unit>> createUnit(Unit unit);
}

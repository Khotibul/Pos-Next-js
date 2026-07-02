import 'package:dartz/dartz.dart' show Either;

import '../entities/supplier.dart';
import '../../core/errors/failures.dart';

abstract class SupplierRepository {
  Future<Either<Failure, List<Supplier>>> getSuppliers({bool? activeOnly, String? search});
  Future<Either<Failure, Supplier>> getSupplier(int id);
  Future<Either<Failure, Supplier>> createSupplier(Supplier supplier);
  Future<Either<Failure, Supplier>> updateSupplier(Supplier supplier);
  Future<Either<Failure, void>> deleteSupplier(int id);
}

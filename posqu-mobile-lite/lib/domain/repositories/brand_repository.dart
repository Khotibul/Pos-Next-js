import 'package:dartz/dartz.dart' show Either;

import '../entities/brand.dart';
import '../../core/errors/failures.dart';

abstract class BrandRepository {
  Future<Either<Failure, List<Brand>>> getBrands();
  Future<Either<Failure, Brand>> createBrand(Brand brand);
}

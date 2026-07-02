import 'package:dartz/dartz.dart' show Either;

import '../entities/category.dart';
import '../../core/errors/failures.dart';

abstract class CategoryRepository {
  Future<Either<Failure, List<Category>>> getCategories({bool? activeOnly});
  Future<Either<Failure, Category>> getCategory(int id);
  Future<Either<Failure, Category>> createCategory(Category category);
  Future<Either<Failure, Category>> updateCategory(Category category);
  Future<Either<Failure, void>> deleteCategory(int id);
}

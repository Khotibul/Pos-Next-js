import 'package:dartz/dartz.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/errors/failures.dart';
import '../../domain/entities/category.dart';
import '../../domain/repositories/category_repository.dart';
import '../datasources/local/database/app_database.dart';
import '../datasources/remote/category_remote_datasource.dart';

final categoryRepositoryProvider = Provider<CategoryRepository>((ref) {
  return CategoryRepositoryImpl(
    remoteDataSource: ref.read(categoryRemoteDataSourceProvider),
    database: ref.read(appDatabaseProvider),
  );
});

class CategoryRepositoryImpl implements CategoryRepository {
  final CategoryRemoteDataSource remoteDataSource;
  final AppDatabase database;

  CategoryRepositoryImpl({
    required this.remoteDataSource,
    required this.database,
  });

  @override
  Future<Either<Failure, Category>> createCategory(Category category) async {
    try {
      final created = await remoteDataSource.createCategory({
        'name': category.name,
        'description': category.description,
      });
      return Right(created.toEntity());
    } catch (e) {
      return const Left(ServerFailure(message: 'Gagal membuat kategori'));
    }
  }

  @override
  Future<Either<Failure, void>> deleteCategory(int id) async {
    try {
      await remoteDataSource.deleteCategory(id);
      return const Right(null);
    } catch (e) {
      return const Left(ServerFailure(message: 'Gagal menghapus kategori'));
    }
  }

  @override
  Future<Either<Failure, List<Category>>> getCategories({bool? activeOnly}) async {
    try {
      final categories = await database.categoryDao.getAll(activeOnly: activeOnly);
      return Right(categories.map((c) => _toEntity(c)).toList());
    } catch (e) {
      return const Left(DatabaseFailure(message: 'Gagal mengambil kategori'));
    }
  }

  @override
  Future<Either<Failure, Category>> getCategory(int id) async {
    try {
      final category = await database.categoryDao.getById(id);
      if (category == null) {
        return const Left(DatabaseFailure(message: 'Kategori tidak ditemukan'));
      }
      return Right(_toEntity(category));
    } catch (e) {
      return const Left(DatabaseFailure(message: 'Gagal mengambil kategori'));
    }
  }

  @override
  Future<Either<Failure, Category>> updateCategory(Category category) async {
    try {
      await remoteDataSource.updateCategory(category.id, {
        'name': category.name,
        'description': category.description,
      });
      return Right(category);
    } catch (e) {
      return const Left(ServerFailure(message: 'Gagal mengupdate kategori'));
    }
  }

  Category _toEntity(CategoriesTableData c) {
    return Category(
      id: c.id,
      name: c.name,
      description: c.description,
      icon: c.icon,
      color: c.color,
      isActive: c.isActive,
      productCount: c.productCount,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    );
  }
}

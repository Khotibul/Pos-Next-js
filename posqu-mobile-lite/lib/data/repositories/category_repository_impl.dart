import 'package:dartz/dartz.dart';
import 'package:dio/dio.dart' show DioException;
import 'package:drift/drift.dart' show Value;
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/errors/failures.dart';
import '../../core/network/mobile_api_gate.dart';
import '../../core/network/network_info.dart';
import '../../domain/entities/category.dart';
import '../../domain/repositories/category_repository.dart';
import '../datasources/local/database/app_database.dart';
import '../datasources/remote/category_remote_datasource.dart';
import '../models/category_model.dart';

final categoryRepositoryProvider = Provider<CategoryRepository>((ref) {
  return CategoryRepositoryImpl(
    remoteDataSource: ref.read(categoryRemoteDataSourceProvider),
    database: ref.read(appDatabaseProvider),
    networkInfo: ref.read(networkInfoProvider),
  );
});

class CategoryRepositoryImpl implements CategoryRepository {
  final CategoryRemoteDataSource remoteDataSource;
  final AppDatabase database;
  final NetworkInfo networkInfo;

  CategoryRepositoryImpl({
    required this.remoteDataSource,
    required this.database,
    required this.networkInfo,
  });

  Future<void> _syncFromServer() async {
    if (!await networkInfo.isConnected) return;
    if (MobileApiGate.isDisabled('categories')) return;
    try {
      final remote = await remoteDataSource.getCategories();
      for (final model in remote) {
        await database.categoryDao.upsertCategory(
          CategoriesTableCompanion(
            id: Value(model.id),
            name: Value(model.name),
          ),
        );
      }
    } on DioException catch (e) {
      if (e.response?.statusCode == 404 || e.response?.statusCode == 501) {
        MobileApiGate.disable('categories');
      }
    } catch (_) {
      // Offline / gangguan lain -> tetap pakai SQLite lokal.
    }
  }

  @override
  Future<Either<Failure, Category>> createCategory(Category category) async {
    try {
      await database.categoryDao.upsertCategory(
        CategoriesTableCompanion(
          id: Value(category.id),
          name: Value(category.name),
          description: Value(category.description),
          icon: Value(category.icon),
          color: Value(category.color),
          isActive: Value(category.isActive),
        ),
      );
      if (await networkInfo.isConnected) {
        try {
          await remoteDataSource.createCategory(CategoryModel.fromEntity(category).toJson());
        } catch (_) {}
      }
      return Right(category);
    } catch (e) {
      return Left(DatabaseFailure(message: 'Gagal membuat kategori: $e'));
    }
  }

  @override
  Future<Either<Failure, void>> deleteCategory(String id) async {
    try {
      await database.categoryDao.deleteCategory(id);
      if (await networkInfo.isConnected) {
        try {
          await remoteDataSource.deleteCategory(id);
        } catch (_) {}
      }
      return const Right(null);
    } catch (e) {
      return Left(DatabaseFailure(message: 'Gagal menghapus kategori: $e'));
    }
  }

  @override
  Future<Either<Failure, List<Category>>> getCategories({bool? activeOnly}) async {
    try {
      await _syncFromServer();
      final categories = await database.categoryDao.getAll(activeOnly: activeOnly);
      return Right(categories.map((c) => _toEntity(c)).toList());
    } catch (e) {
      return const Left(DatabaseFailure(message: 'Gagal mengambil kategori'));
    }
  }

  @override
  Future<Either<Failure, Category>> getCategory(String id) async {
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
      await database.categoryDao.updateCategory(
        CategoriesTableCompanion(
          id: Value(category.id),
          name: Value(category.name),
          description: Value(category.description),
          icon: Value(category.icon),
          color: Value(category.color),
          isActive: Value(category.isActive),
          updatedAt: Value(DateTime.now()),
        ),
      );
      if (await networkInfo.isConnected) {
        try {
          await remoteDataSource.updateCategory(category.id, CategoryModel.fromEntity(category).toJson());
        } catch (_) {}
      }
      return Right(category);
    } catch (e) {
      return Left(DatabaseFailure(message: 'Gagal mengupdate kategori: $e'));
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

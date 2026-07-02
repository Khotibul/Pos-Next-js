import 'package:dartz/dartz.dart';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/errors/exceptions.dart';
import '../../core/errors/failures.dart';
import '../../domain/entities/user.dart';
import '../../domain/repositories/auth_repository.dart';
import '../datasources/local/database/app_database.dart';
import '../datasources/local/hive_cache.dart';
import '../datasources/remote/auth_remote_datasource.dart';
import '../models/user_model.dart';

final authRepositoryProvider = Provider<AuthRepositoryImpl>((ref) {
  return AuthRepositoryImpl(
    remoteDataSource: ref.read(authRemoteDataSourceProvider),
    cache: ref.read(hiveCacheProvider),
    database: ref.read(appDatabaseProvider),
  );
});

class AuthRepositoryImpl implements AuthRepository {
  final AuthRemoteDataSource remoteDataSource;
  final HiveCache cache;
  final AppDatabase database;

  AuthRepositoryImpl({
    required this.remoteDataSource,
    required this.cache,
    required this.database,
  });

  @override
  Future<Either<Failure, User>> login(String email, String password) async {
    try {
      final result = await remoteDataSource.login(email, password);
      final user = result.user.toEntity();

      await cache.saveToken(result.token);
      await cache.saveUserData(result.user.toJson());

      return Right(user);
    } on ServerException catch (e) {
      return Left(ServerFailure(message: e.message, statusCode: e.statusCode));
    } on DioException catch (e) {
      return Left(ServerFailure(message: e.message ?? 'Login gagal'));
    } catch (e) {
      return Left(ServerFailure(message: e.toString()));
    }
  }

  @override
  Future<Either<Failure, void>> logout() async {
    try {
      await cache.clearAuth();
      return const Right(null);
    } catch (e) {
      return Left(CacheFailure(message: e.toString()));
    }
  }

  @override
  Future<Either<Failure, User>> getCurrentUser() async {
    try {
      final userData = cache.getUserData();
      if (userData != null) {
        return Right(UserModel.fromJson(userData).toEntity());
      }
      final userModel = await remoteDataSource.getCurrentUser();
      await cache.saveUserData(userModel.toJson());
      return Right(userModel.toEntity());
    } on ServerException catch (e) {
      return Left(ServerFailure(message: e.message, statusCode: e.statusCode));
    } catch (e) {
      return Left(CacheFailure(message: e.toString()));
    }
  }

  @override
  Future<Either<Failure, bool>> isLoggedIn() async {
    try {
      final token = cache.getToken();
      return Right(token != null && token.isNotEmpty);
    } catch (e) {
      return const Right(false);
    }
  }

  @override
  Future<Either<Failure, String?>> getToken() async {
    try {
      return Right(cache.getToken());
    } catch (e) {
      return const Right(null);
    }
  }
}

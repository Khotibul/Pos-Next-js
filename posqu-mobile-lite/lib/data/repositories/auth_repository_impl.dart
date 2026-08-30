import 'dart:convert';

import 'package:crypto/crypto.dart';
import 'package:dartz/dartz.dart';
import 'package:dio/dio.dart';
import 'package:drift/drift.dart' show Value;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';

import '../../core/errors/exceptions.dart';
import '../../core/errors/failures.dart';
import '../../core/network/network_info.dart';
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
    networkInfo: ref.read(networkInfoProvider),
  );
});

class AuthRepositoryImpl implements AuthRepository {
  final AuthRemoteDataSource remoteDataSource;
  final HiveCache cache;
  final AppDatabase database;
  final NetworkInfo networkInfo;

  AuthRepositoryImpl({
    required this.remoteDataSource,
    required this.cache,
    required this.database,
    required this.networkInfo,
  });

  static const String _localTokenPrefix = 'local.';

  @override
  Future<Either<Failure, User>> login(String email, String password) async {
    final normalizedEmail = email.trim().toLowerCase();
    if (normalizedEmail.isEmpty || password.isEmpty) {
      return const Left(ServerFailure(message: 'Email dan password wajib diisi.'));
    }

    final online = await networkInfo.isConnected;
    if (!online) {
      return _loginLocally(normalizedEmail, password);
    }

    Failure? remoteFailure;
    try {
      final result = await remoteDataSource.login(normalizedEmail, password);
      final user = result.user.toEntity();

      await cache.saveToken(result.token);
      await cache.saveUserData(result.user.toJson());
      await _cacheLocalCredentials(normalizedEmail, password, user);

      return Right(user);
    } on ServerException catch (e) {
      remoteFailure = ServerFailure(message: e.message, statusCode: e.statusCode);
      if (e.statusCode != 401 && e.statusCode != 404) {
        return Left(remoteFailure);
      }
    } on DioException catch (e) {
      final statusCode = e.response?.statusCode;
      final data = e.response?.data;
      final message = (data is Map && data['message'] is String)
          ? data['message'] as String
          : e.message ?? 'Login gagal';

      if (statusCode != null && statusCode != 401 && statusCode != 404) {
        return Left(ServerFailure(message: message));
      }
      remoteFailure = ServerFailure(message: message);
    } catch (e) {
      remoteFailure = ServerFailure(message: e.toString());
    }

    final localResult = await _loginLocally(normalizedEmail, password);
    return localResult.fold(
      (localError) => Left(remoteFailure ?? localError),
      (user) => Right(user),
    );
  }

  Future<Either<Failure, User>> _loginLocally(
    String email,
    String password,
  ) async {
    try {
      final row = await database.userDao.getByEmail(email);
      if (row == null) {
        return const Left(AuthFailure(
          message:
              'Email atau password salah. Akun tidak ditemukan di server maupun perangkat ini.',
        ));
      }
      if (row.isActive == false) {
        return const Left(
          ServerFailure(message: 'Akun ini tidak aktif.', statusCode: 403),
        );
      }
      final hashed = sha256.convert(utf8.encode(password)).toString();
      if (row.passwordHash == null || row.passwordHash != hashed) {
        return const Left(AuthFailure(
          message:
              'Email atau password salah. Akun tidak ditemukan di server maupun perangkat ini.',
        ));
      }

      final user = User(
        id: row.id,
        name: (row.name?.trim().isNotEmpty == true)
            ? row.name!.trim()
            : email.split('@').first,
        email: row.email ?? email,
        avatarUrl: row.image,
        role: row.isSuperAdmin ? 'ADMIN' : 'USER',
        isActive: row.isActive,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      );
      final userModel = UserModel.fromEntity(user);

      await cache.saveToken('$_localTokenPrefix${const Uuid().v4()}');
      await cache.saveUserData(userModel.toJson());

      return Right(user);
    } catch (e) {
      return Left(DatabaseFailure(message: 'Login lokal gagal: $e'));
    }
  }

  Future<void> _cacheLocalCredentials(String email, String password, User user) async {
    try {
      final hashed = sha256.convert(utf8.encode(password)).toString();
      await database.userDao.upsertUser(UsersTableCompanion(
        id: Value(user.id),
        email: Value(email),
        name: Value(user.name),
        image: Value(user.avatarUrl),
        passwordHash: Value(hashed),
        isActive: const Value(true),
        isSuperAdmin: Value(user.role == 'ADMIN' || email.contains('superadmin')),
        updatedAt: Value(DateTime.now()),
      ));
    } catch (_) {}
  }

  @override
  Future<Either<Failure, void>> logout() async {
    try {
      final token = cache.getToken();
      final isLocalSession =
          token != null && token.startsWith(_localTokenPrefix);
      if (!isLocalSession) {
        try {
          await remoteDataSource.logout();
        } catch (_) {}
      }
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

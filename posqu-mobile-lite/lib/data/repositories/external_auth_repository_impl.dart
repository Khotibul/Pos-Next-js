import 'package:dartz/dartz.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/errors/failures.dart';
import '../../../../domain/entities/user.dart';
import '../../../../domain/repositories/external_auth_repository.dart';
import '../datasources/external/google_auth_datasource.dart';

final externalAuthRepositoryProvider = Provider<ExternalAuthRepositoryImpl>((ref) {
  return ExternalAuthRepositoryImpl(
    googleAuthDataSource: ref.read(googleAuthDataSourceProvider),
    appleAuthDataSource: ref.read(appleAuthDataSourceProvider),
  );
});

class ExternalAuthRepositoryImpl implements ExternalAuthRepository {
  final GoogleAuthDataSource googleAuthDataSource;
  final AppleAuthDataSource appleAuthDataSource;

  ExternalAuthRepositoryImpl({
    required this.googleAuthDataSource,
    required this.appleAuthDataSource,
  });

  @override
  Future<Either<Failure, User>> signInWithGoogle() async {
    try {
      final user = await googleAuthDataSource.signInWithGoogle();
      if (user == null) {
        return const Left(CancelledFailure(message: 'Google Sign-In was cancelled'));
      }
      return Right(user);
    } on Exception catch (e) {
      return Left(ServerFailure(message: e.toString()));
    }
  }

  @override
  Future<Either<Failure, User>> signInWithApple() async {
    try {
      final user = await appleAuthDataSource.signInWithApple();
      if (user == null) {
        return const Left(CancelledFailure(message: 'Apple Sign-In was cancelled'));
      }
      return Right(user);
    } on Exception catch (e) {
      return Left(ServerFailure(message: e.toString()));
    }
  }

  @override
  Future<Either<Failure, void>> signOutFromGoogle() async {
    try {
      await googleAuthDataSource.signOutFromGoogle();
      return const Right(null);
    } on Exception catch (e) {
      return Left(ServerFailure(message: e.toString()));
    }
  }

  @override
  Future<Either<Failure, bool>> isSignedInWithGoogle() async {
    try {
      final isSignedIn =
          await googleAuthDataSource.isSignedInWithGoogle();
      return Right(isSignedIn);
    } on Exception catch (e) {
      return Left(ServerFailure(message: e.toString()));
    }
  }
}
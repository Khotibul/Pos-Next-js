import 'package:dartz/dartz.dart';
import 'package:dio/dio.dart' show DioException;
import 'package:drift/drift.dart' show Value;
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/errors/failures.dart';
import '../../core/network/mobile_api_gate.dart';
import '../../core/network/network_info.dart';
import '../../domain/entities/brand.dart';
import '../../domain/repositories/brand_repository.dart';
import '../datasources/local/database/app_database.dart';
import '../datasources/local/database/tables/brands_table.dart';
import '../datasources/remote/brand_remote_datasource.dart';

final brandRepositoryProvider = Provider<BrandRepository>((ref) {
  return BrandRepositoryImpl(
    remoteDataSource: ref.read(brandRemoteDataSourceProvider),
    database: ref.read(appDatabaseProvider),
    networkInfo: ref.read(networkInfoProvider),
  );
});

class BrandRepositoryImpl implements BrandRepository {
  final BrandRemoteDataSource remoteDataSource;
  final AppDatabase database;
  final NetworkInfo networkInfo;

  BrandRepositoryImpl({
    required this.remoteDataSource,
    required this.database,
    required this.networkInfo,
  });

  Future<void> _syncFromServer() async {
    if (!await networkInfo.isConnected) return;
    if (MobileApiGate.isDisabled('brands')) return;

    try {
      final remote = await remoteDataSource.getBrands();
      for (final model in remote) {
        await database.into(database.brandsTable).insertOnConflictUpdate(
              BrandsTableCompanion(
                id: Value(model.id),
                name: Value(model.name),
                createdAt: Value(model.createdAt),
                updatedAt: Value(model.updatedAt),
              ),
            );
      }
    } on DioException catch (e) {
      if (e.response?.statusCode == 404 || e.response?.statusCode == 501) {
        MobileApiGate.disable('brands');
      }
    } catch (_) {}
  }

  @override
  Future<Either<Failure, List<Brand>>> getBrands() async {
    try {
      await _syncFromServer();
      final rows = await (database.select(database.brandsTable)
            ..orderBy([(t) => t.name]))
          .get();
      return Right(rows.map((r) => Brand(
            id: r.id,
            name: r.name,
            createdAt: r.createdAt,
            updatedAt: r.updatedAt,
          )).toList());
    } catch (e) {
      return const Left(DatabaseFailure(message: 'Gagal mengambil data merek'));
    }
  }

  @override
  Future<Either<Failure, Brand>> createBrand(Brand brand) async {
    var pushed = false;
    if (await networkInfo.isConnected) {
      try {
        await remoteDataSource.createBrand({
          'id': brand.id,
          'name': brand.name,
        });
        pushed = true;
      } catch (_) {}
    }
    try {
      await database.into(database.brandsTable).insertOnConflictUpdate(
            BrandsTableCompanion(
              id: Value(brand.id),
              name: Value(brand.name),
              isSynced: Value(pushed),
            ),
          );
      return Right(brand);
    } catch (e) {
      return Left(DatabaseFailure(message: 'Gagal membuat merek: $e'));
    }
  }
}

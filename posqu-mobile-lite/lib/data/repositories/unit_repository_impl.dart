import 'package:dartz/dartz.dart';
import 'package:dio/dio.dart' show DioException;
import 'package:drift/drift.dart' show Value;
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/errors/failures.dart';
import '../../core/network/mobile_api_gate.dart';
import '../../core/network/network_info.dart';
import '../../domain/entities/unit.dart';
import '../../domain/repositories/unit_repository.dart';
import '../datasources/local/database/app_database.dart';
import '../datasources/local/database/tables/units_table.dart';
import '../datasources/remote/unit_remote_datasource.dart';

final unitRepositoryProvider = Provider<UnitRepository>((ref) {
  return UnitRepositoryImpl(
    remoteDataSource: ref.read(unitRemoteDataSourceProvider),
    database: ref.read(appDatabaseProvider),
    networkInfo: ref.read(networkInfoProvider),
  );
});

class UnitRepositoryImpl implements UnitRepository {
  final UnitRemoteDataSource remoteDataSource;
  final AppDatabase database;
  final NetworkInfo networkInfo;

  UnitRepositoryImpl({
    required this.remoteDataSource,
    required this.database,
    required this.networkInfo,
  });

  Future<void> _syncFromServer() async {
    if (!await networkInfo.isConnected) return;
    if (MobileApiGate.isDisabled('units')) return;

    try {
      final remote = await remoteDataSource.getUnits();
      for (final model in remote) {
        await database.into(database.unitsTable).insertOnConflictUpdate(
              UnitsTableCompanion(
                id: Value(model.id),
                name: Value(model.name),
                createdAt: Value(model.createdAt),
                updatedAt: Value(model.updatedAt),
              ),
            );
      }
    } on DioException catch (e) {
      if (e.response?.statusCode == 404 || e.response?.statusCode == 501) {
        MobileApiGate.disable('units');
      }
    } catch (_) {}
  }

  @override
  Future<Either<Failure, List<Unit>>> getUnits() async {
    try {
      await _syncFromServer();
      final rows = await (database.select(database.unitsTable)
            ..orderBy([(t) => t.name]))
          .get();
      return Right(rows.map((r) => Unit(
            id: r.id,
            name: r.name,
            createdAt: r.createdAt,
            updatedAt: r.updatedAt,
          )).toList());
    } catch (e) {
      return const Left(DatabaseFailure(message: 'Gagal mengambil data satuan'));
    }
  }

  @override
  Future<Either<Failure, Unit>> createUnit(Unit unit) async {
    var pushed = false;
    if (await networkInfo.isConnected) {
      try {
        await remoteDataSource.createUnit({
          'id': unit.id,
          'name': unit.name,
        });
        pushed = true;
      } catch (_) {}
    }
    try {
      await database.into(database.unitsTable).insertOnConflictUpdate(
            UnitsTableCompanion(
              id: Value(unit.id),
              name: Value(unit.name),
              isSynced: Value(pushed),
            ),
          );
      return Right(unit);
    } catch (e) {
      return Left(DatabaseFailure(message: 'Gagal membuat satuan: $e'));
    }
  }
}

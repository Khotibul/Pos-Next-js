import 'package:dartz/dartz.dart';
import 'package:dio/dio.dart' show DioException;
import 'package:drift/drift.dart' show Value;
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/errors/failures.dart';
import '../../core/network/mobile_api_gate.dart';
import '../../core/network/network_info.dart';
import '../../domain/entities/supplier.dart';
import '../../domain/repositories/supplier_repository.dart';
import '../datasources/local/database/app_database.dart';
import '../datasources/remote/supplier_remote_datasource.dart';
import '../models/supplier_model.dart';

final supplierRepositoryProvider = Provider<SupplierRepository>((ref) {
  return SupplierRepositoryImpl(
    remoteDataSource: ref.read(supplierRemoteDataSourceProvider),
    database: ref.read(appDatabaseProvider),
    networkInfo: ref.read(networkInfoProvider),
  );
});

class SupplierRepositoryImpl implements SupplierRepository {
  final SupplierRemoteDataSource remoteDataSource;
  final AppDatabase database;
  final NetworkInfo networkInfo;

  SupplierRepositoryImpl({
    required this.remoteDataSource,
    required this.database,
    required this.networkInfo,
  });

  /// Dorong pemasok lokal yang belum tersinkron (dibuat/diubah offline).
  Future<void> _pushPendingSuppliers() async {
    final pending = await database.supplierDao.getUnsynced();
    for (final row in pending) {
      try {
        await remoteDataSource.createSupplier({
          'id': row.id,
          'name': row.name,
          'email': row.email,
          'phone': row.phone,
          'address': row.address,
          'isActive': row.isActive,
        });
        await database.supplierDao.markSynced([row.id]);
      } on DioException catch (e) {
        if (e.response?.statusCode == 400) {
          await database.supplierDao.markSynced([row.id]);
          continue;
        }
        break;
      } catch (_) {
        break;
      }
    }
  }

  Future<void> _syncFromServer() async {
    if (!await networkInfo.isConnected) return;
    if (MobileApiGate.isDisabled('suppliers')) return;

    await _pushPendingSuppliers();

    try {
      final remote = await remoteDataSource.getSuppliers();
      for (final model in remote) {
        await database.supplierDao.upsertSupplier(
          SuppliersTableCompanion(
            id: Value(model.id),
            name: Value(model.name),
            email: Value(model.email),
            phone: Value(model.phone),
            address: Value(model.address),
            isActive: Value(model.isActive),
            isSynced: const Value(true),
          ),
        );
      }
    } on DioException catch (e) {
      if (e.response?.statusCode == 404 || e.response?.statusCode == 501) {
        MobileApiGate.disable('suppliers');
      }
    } catch (_) {
      // Offline / gangguan lain -> tetap pakai SQLite lokal.
    }
  }

  @override
  Future<Either<Failure, Supplier>> createSupplier(Supplier supplier) async {
    try {
      await database.supplierDao.upsertSupplier(
        SuppliersTableCompanion(
          id: Value(supplier.id),
          name: Value(supplier.name),
          email: Value(supplier.email),
          phone: Value(supplier.phone),
          address: Value(supplier.address),
          city: Value(supplier.city),
          contactPerson: Value(supplier.contactPerson),
          npwp: Value(supplier.npwp),
          isActive: Value(supplier.isActive),
          isSynced: const Value(false),
        ),
      );
      if (await networkInfo.isConnected) {
        try {
          await remoteDataSource.createSupplier(SupplierModel.fromEntity(supplier).toJson());
        } catch (_) {}
      }
      return Right(supplier);
    } catch (e) {
      return Left(DatabaseFailure(message: 'Gagal membuat supplier: $e'));
    }
  }

  @override
  Future<Either<Failure, void>> deleteSupplier(String id) async {
    try {
      await database.supplierDao.deleteSupplier(id);
      if (await networkInfo.isConnected) {
        try {
          await remoteDataSource.deleteSupplier(id);
        } catch (_) {}
      }
      return const Right(null);
    } catch (e) {
      return Left(DatabaseFailure(message: 'Gagal menghapus supplier: $e'));
    }
  }

  @override
  Future<Either<Failure, Supplier>> getSupplier(String id) async {
    try {
      final supplier = await database.supplierDao.getById(id);
      if (supplier == null) {
        return const Left(DatabaseFailure(message: 'Supplier tidak ditemukan'));
      }
      return Right(_toEntity(supplier));
    } catch (e) {
      return const Left(DatabaseFailure(message: 'Gagal mengambil supplier'));
    }
  }

  @override
  Future<Either<Failure, List<Supplier>>> getSuppliers({
    bool? activeOnly,
    String? search,
  }) async {
    try {
      await _syncFromServer();
      final suppliers = await database.supplierDao.getAll(
        activeOnly: activeOnly,
        search: search,
      );
      return Right(suppliers.map((s) => _toEntity(s)).toList());
    } catch (e) {
      return const Left(DatabaseFailure(message: 'Gagal mengambil supplier'));
    }
  }

  @override
  Future<Either<Failure, Supplier>> updateSupplier(Supplier supplier) async {
    try {
      await database.supplierDao.updateSupplier(
        SuppliersTableCompanion(
          id: Value(supplier.id),
          name: Value(supplier.name),
          email: Value(supplier.email),
          phone: Value(supplier.phone),
          address: Value(supplier.address),
          city: Value(supplier.city),
          contactPerson: Value(supplier.contactPerson),
          npwp: Value(supplier.npwp),
          isActive: Value(supplier.isActive),
          updatedAt: Value(DateTime.now()),
          isSynced: const Value(false),
        ),
      );
      if (await networkInfo.isConnected) {
        try {
          await remoteDataSource.updateSupplier(supplier.id, SupplierModel.fromEntity(supplier).toJson());
        } catch (_) {}
      }
      return Right(supplier);
    } catch (e) {
      return Left(DatabaseFailure(message: 'Gagal mengupdate supplier: $e'));
    }
  }

  Supplier _toEntity(SuppliersTableData s) {
    return Supplier(
      id: s.id,
      name: s.name,
      phone: s.phone,
      email: s.email,
      address: s.address,
      city: s.city,
      contactPerson: s.contactPerson,
      npwp: s.npwp,
      isActive: s.isActive,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    );
  }
}

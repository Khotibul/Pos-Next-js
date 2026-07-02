import 'package:dartz/dartz.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/errors/failures.dart';
import '../../domain/entities/supplier.dart';
import '../../domain/repositories/supplier_repository.dart';
import '../datasources/local/database/app_database.dart';
import '../datasources/remote/supplier_remote_datasource.dart';

final supplierRepositoryProvider = Provider<SupplierRepository>((ref) {
  return SupplierRepositoryImpl(
    remoteDataSource: ref.read(supplierRemoteDataSourceProvider),
    database: ref.read(appDatabaseProvider),
  );
});

class SupplierRepositoryImpl implements SupplierRepository {
  final SupplierRemoteDataSource remoteDataSource;
  final AppDatabase database;

  SupplierRepositoryImpl({
    required this.remoteDataSource,
    required this.database,
  });

  @override
  Future<Either<Failure, Supplier>> createSupplier(Supplier supplier) async {
    try {
      final created = await remoteDataSource.createSupplier({
        'name': supplier.name,
        'phone': supplier.phone,
        'email': supplier.email,
        'address': supplier.address,
        'city': supplier.city,
        'contact_person': supplier.contactPerson,
        'npwp': supplier.npwp,
      });
      return Right(created.toEntity());
    } catch (e) {
      return const Left(ServerFailure(message: 'Gagal membuat supplier'));
    }
  }

  @override
  Future<Either<Failure, void>> deleteSupplier(int id) async {
    try {
      await remoteDataSource.deleteSupplier(id);
      return const Right(null);
    } catch (e) {
      return const Left(ServerFailure(message: 'Gagal menghapus supplier'));
    }
  }

  @override
  Future<Either<Failure, Supplier>> getSupplier(int id) async {
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
      await remoteDataSource.updateSupplier(supplier.id, {
        'name': supplier.name,
        'phone': supplier.phone,
        'email': supplier.email,
        'address': supplier.address,
        'city': supplier.city,
        'contact_person': supplier.contactPerson,
        'npwp': supplier.npwp,
      });
      return Right(supplier);
    } catch (e) {
      return const Left(ServerFailure(message: 'Gagal mengupdate supplier'));
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

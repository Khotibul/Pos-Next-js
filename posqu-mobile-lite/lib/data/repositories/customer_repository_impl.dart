import 'package:dartz/dartz.dart';
import 'package:dio/dio.dart' show DioException;
import 'package:drift/drift.dart' show Value;
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/errors/failures.dart';
import '../../core/network/mobile_api_gate.dart';
import '../../core/network/network_info.dart';
import '../../domain/entities/customer.dart';
import '../../domain/repositories/customer_repository.dart';
import '../datasources/local/database/app_database.dart';
import '../datasources/remote/customer_remote_datasource.dart';
import '../models/customer_model.dart';

final customerRepositoryProvider = Provider<CustomerRepository>((ref) {
  return CustomerRepositoryImpl(
    remoteDataSource: ref.read(customerRemoteDataSourceProvider),
    database: ref.read(appDatabaseProvider),
    networkInfo: ref.read(networkInfoProvider),
  );
});

class CustomerRepositoryImpl implements CustomerRepository {
  final CustomerRemoteDataSource remoteDataSource;
  final AppDatabase database;
  final NetworkInfo networkInfo;

  CustomerRepositoryImpl({
    required this.remoteDataSource,
    required this.database,
    required this.networkInfo,
  });

  /// Dorong pelanggan lokal yang belum tersinkron (dibuat/diubah offline).
  Future<void> _pushPendingCustomers() async {
    final pending = await database.customerDao.getUnsynced();
    for (final row in pending) {
      try {
        await remoteDataSource.createCustomer({
          'id': row.id,
          'name': row.name,
          'email': row.email,
          'phone': row.phone,
          'address': row.address,
          'isActive': row.isActive,
        });
        await database.customerDao.markSynced([row.id]);
      } on DioException catch (e) {
        if (e.response?.statusCode == 400) {
          await database.customerDao.markSynced([row.id]);
          continue;
        }
        if (e.response?.statusCode == 404 || e.response?.statusCode == 501) {
          MobileApiGate.disable('customers');
        }
        break;
      } catch (_) {
        break;
      }
    }
  }

  Future<void> _syncFromServer() async {
    if (!await networkInfo.isConnected) return;
    if (MobileApiGate.isDisabled('customers')) return;

    await _pushPendingCustomers();

    try {
      final remote = await remoteDataSource.getCustomers();
      for (final model in remote) {
        await database.customerDao.upsertCustomer(
          CustomersTableCompanion(
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
        MobileApiGate.disable('customers');
      }
    } catch (_) {
      // Offline / gangguan lain -> tetap pakai SQLite lokal.
    }
  }

  @override
  Future<Either<Failure, Customer>> createCustomer(Customer customer) async {
    var pushed = false;
    if (await networkInfo.isConnected) {
      try {
        await remoteDataSource.createCustomer(CustomerModel.fromEntity(customer).toJson());
        pushed = true;
      } catch (_) {}
    }
    try {
      await database.customerDao.upsertCustomer(
        CustomersTableCompanion(
          id: Value(customer.id),
          name: Value(customer.name),
          email: Value(customer.email),
          phone: Value(customer.phone),
          address: Value(customer.address),
          city: Value(customer.city),
          totalPurchase: Value(customer.totalPurchase),
          purchaseCount: Value(customer.purchaseCount),
          points: Value(customer.points),
          isActive: Value(customer.isActive),
          isSynced: Value(pushed),
        ),
      );
      return Right(customer);
    } catch (e) {
      return Left(DatabaseFailure(message: 'Gagal membuat pelanggan: $e'));
    }
  }

  @override
  Future<Either<Failure, void>> deleteCustomer(String id) async {
    try {
      await database.customerDao.deleteCustomer(id);
      if (await networkInfo.isConnected) {
        try {
          await remoteDataSource.deleteCustomer(id);
        } catch (_) {}
      }
      return const Right(null);
    } catch (e) {
      return Left(DatabaseFailure(message: 'Gagal menghapus pelanggan: $e'));
    }
  }

  @override
  Future<Either<Failure, Customer>> getCustomer(String id) async {
    try {
      final customer = await database.customerDao.getById(id);
      if (customer == null) {
        return const Left(DatabaseFailure(message: 'Pelanggan tidak ditemukan'));
      }
      return Right(_toEntity(customer));
    } catch (e) {
      return const Left(DatabaseFailure(message: 'Gagal mengambil pelanggan'));
    }
  }

  @override
  Future<Either<Failure, List<Customer>>> getCustomers({
    bool? activeOnly,
    String? search,
    int page = 1,
    int limit = 20,
  }) async {
    try {
      await _syncFromServer();
      final customers = await database.customerDao.getAll(
        activeOnly: activeOnly,
        search: search,
      );
      return Right(customers.map((c) => _toEntity(c)).toList());
    } catch (e) {
      return const Left(DatabaseFailure(message: 'Gagal mengambil pelanggan'));
    }
  }

  @override
  Future<Either<Failure, Customer>> updateCustomer(Customer customer) async {
    var pushed = false;
    if (await networkInfo.isConnected) {
      try {
        await remoteDataSource.updateCustomer(
            customer.id, CustomerModel.fromEntity(customer).toJson());
        pushed = true;
      } catch (_) {}
    }
    try {
      await database.customerDao.updateCustomer(
        CustomersTableCompanion(
          id: Value(customer.id),
          name: Value(customer.name),
          email: Value(customer.email),
          phone: Value(customer.phone),
          address: Value(customer.address),
          city: Value(customer.city),
          totalPurchase: Value(customer.totalPurchase),
          purchaseCount: Value(customer.purchaseCount),
          points: Value(customer.points),
          isActive: Value(customer.isActive),
          updatedAt: Value(DateTime.now()),
          isSynced: Value(pushed),
        ),
      );
      return Right(customer);
    } catch (e) {
      return Left(DatabaseFailure(message: 'Gagal mengupdate pelanggan: $e'));
    }
  }

  Customer _toEntity(CustomersTableData c) {
    return Customer(
      id: c.id,
      name: c.name,
      phone: c.phone,
      email: c.email,
      address: c.address,
      city: c.city,
      totalPurchase: c.totalPurchase,
      purchaseCount: c.purchaseCount,
      points: c.points,
      isActive: c.isActive,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    );
  }
}

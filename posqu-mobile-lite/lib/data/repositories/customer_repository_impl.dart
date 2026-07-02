import 'package:dartz/dartz.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/errors/failures.dart';
import '../../domain/entities/customer.dart';
import '../../domain/repositories/customer_repository.dart';
import '../datasources/local/database/app_database.dart';
import '../datasources/remote/customer_remote_datasource.dart';

final customerRepositoryProvider = Provider<CustomerRepository>((ref) {
  return CustomerRepositoryImpl(
    remoteDataSource: ref.read(customerRemoteDataSourceProvider),
    database: ref.read(appDatabaseProvider),
  );
});

class CustomerRepositoryImpl implements CustomerRepository {
  final CustomerRemoteDataSource remoteDataSource;
  final AppDatabase database;

  CustomerRepositoryImpl({
    required this.remoteDataSource,
    required this.database,
  });

  @override
  Future<Either<Failure, Customer>> createCustomer(Customer customer) async {
    try {
      final created = await remoteDataSource.createCustomer({
        'name': customer.name,
        'phone': customer.phone,
        'email': customer.email,
        'address': customer.address,
        'city': customer.city,
      });
      return Right(created.toEntity());
    } catch (e) {
      return const Left(ServerFailure(message: 'Gagal membuat pelanggan'));
    }
  }

  @override
  Future<Either<Failure, void>> deleteCustomer(int id) async {
    try {
      await remoteDataSource.deleteCustomer(id);
      return const Right(null);
    } catch (e) {
      return const Left(ServerFailure(message: 'Gagal menghapus pelanggan'));
    }
  }

  @override
  Future<Either<Failure, Customer>> getCustomer(int id) async {
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
    try {
      await remoteDataSource.updateCustomer(customer.id, {
        'name': customer.name,
        'phone': customer.phone,
        'email': customer.email,
        'address': customer.address,
        'city': customer.city,
      });
      return Right(customer);
    } catch (e) {
      return const Left(ServerFailure(message: 'Gagal mengupdate pelanggan'));
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

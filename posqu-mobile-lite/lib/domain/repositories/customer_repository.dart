import 'package:dartz/dartz.dart' show Either;

import '../entities/customer.dart';
import '../../core/errors/failures.dart';

abstract class CustomerRepository {
  Future<Either<Failure, List<Customer>>> getCustomers({
    bool? activeOnly,
    String? search,
    int page = 1,
    int limit = 20,
  });
  Future<Either<Failure, Customer>> getCustomer(String id);
  Future<Either<Failure, Customer>> createCustomer(Customer customer);
  Future<Either<Failure, Customer>> updateCustomer(Customer customer);
  Future<Either<Failure, void>> deleteCustomer(String id);
}

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../data/repositories/customer_repository_impl.dart';
import '../../../domain/entities/customer.dart';

final customerListProvider = FutureProvider<List<Customer>>((ref) async {
  final repository = ref.read(customerRepositoryProvider);
  final result = await repository.getCustomers();
  return result.fold((failure) => [], (customers) => customers);
});

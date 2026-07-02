import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../data/repositories/supplier_repository_impl.dart';
import '../../../domain/entities/supplier.dart';

final supplierListProvider = FutureProvider<List<Supplier>>((ref) async {
  final repository = ref.read(supplierRepositoryProvider);
  final result = await repository.getSuppliers(activeOnly: true);
  return result.fold((failure) => [], (suppliers) => suppliers);
});

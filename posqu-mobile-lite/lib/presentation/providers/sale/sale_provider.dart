import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../data/repositories/sale_repository_impl.dart';
import '../../../domain/entities/sale.dart';

final saleListProvider = FutureProvider<List<Sale>>((ref) async {
  final repository = ref.read(saleRepositoryProvider);
  final result = await repository.getSales();
  return result.fold((failure) => [], (sales) => sales);
});

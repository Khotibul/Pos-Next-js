import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../data/repositories/purchase_repository_impl.dart';
import '../../../domain/entities/purchase.dart';

final purchaseListProvider = FutureProvider<List<Purchase>>((ref) async {
  final repository = ref.read(purchaseRepositoryProvider);
  final result = await repository.getPurchases();
  return result.fold((failure) => [], (purchases) => purchases);
});

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../data/repositories/return_repository_impl.dart';
import '../../../domain/entities/return.dart';

final returnListProvider = FutureProvider<List<Return>>((ref) async {
  final repository = ref.read(returnRepositoryProvider);
  final result = await repository.getReturns();
  return result.fold((failure) => [], (returns) => returns);
});

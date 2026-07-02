import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../data/repositories/category_repository_impl.dart';
import '../../../domain/entities/category.dart';

final categoryListProvider = FutureProvider<List<Category>>((ref) async {
  final repository = ref.read(categoryRepositoryProvider);
  final result = await repository.getCategories(activeOnly: true);
  return result.fold((failure) => [], (categories) => categories);
});

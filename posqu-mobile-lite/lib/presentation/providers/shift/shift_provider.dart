import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../data/repositories/cashier_shift_repository_impl.dart';
import '../../../domain/entities/cashier_shift.dart';

final activeShiftProvider = FutureProvider.family<CashierShift?, int>(
  (ref, userId) async {
    final repository = ref.read(cashierShiftRepositoryProvider);
    final result = await repository.getActiveShift(userId);
    return result.fold((failure) => null, (shift) => shift);
  },
);

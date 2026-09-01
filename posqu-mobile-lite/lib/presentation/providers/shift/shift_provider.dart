import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';

import '../../../data/repositories/cashier_shift_repository_impl.dart';
import '../../../domain/entities/cashier_shift.dart';
import '../../../domain/repositories/cashier_shift_repository.dart';

final activeShiftProvider = FutureProvider.family<CashierShift?, String>(
  (ref, cashierId) async {
    final repository = ref.read(cashierShiftRepositoryProvider);
    final result = await repository.getActiveShift(cashierId);
    return result.fold((failure) => null, (shift) => shift);
  },
);

final shiftsListProvider = FutureProvider<List<CashierShift>>((ref) async {
  final repository = ref.read(cashierShiftRepositoryProvider);
  final result = await repository.getShifts(limit: 20);
  return result.fold((_) => <CashierShift>[], (list) => list);
});

final shiftControllerProvider =
    StateNotifierProvider<ShiftController, AsyncValue<CashierShift?>>((ref) {
  final repository = ref.read(cashierShiftRepositoryProvider);
  return ShiftController(repository: repository, ref: ref);
});

class ShiftController extends StateNotifier<AsyncValue<CashierShift?>> {
  final CashierShiftRepository _repository;
  final Ref _ref;

  ShiftController(
      {required CashierShiftRepository repository, required Ref ref})
      : _repository = repository,
        _ref = ref,
        super(const AsyncValue.loading());

  Future<bool> open(
    String cashierId, {
    String? branchId,
    double openingCash = 0,
    String? openNote,
  }) async {
    state = const AsyncValue.loading();
    final now = DateTime.now();
    final shift = CashierShift(
      id: const Uuid().v4(),
      branchId: branchId,
      cashierId: cashierId,
      openedAt: now,
      createdAt: now,
      updatedAt: now,
      openingCash: openingCash,
      openNote: openNote,
    );
    final result = await _repository.openShift(shift);
    final ok = result.fold((_) => false, (_) => true);
    if (ok) {
      state = AsyncValue.data(shift);
      _invalidate(cashierId);
    } else {
      state = const AsyncValue.data(null);
    }
    return ok;
  }

  Future<bool> close({
    required String shiftId,
    required String cashierId,
    required double cashCounted,
    String? closeNote,
  }) async {
    state = const AsyncValue.loading();
    final activeResult = await _repository.getActiveShift(cashierId);
    CashierShift? base = activeResult.fold((_) => null, (s) => s);
    if (base == null || base.id != shiftId) {
      final shiftResult = await _repository.getShift(shiftId);
      base = shiftResult.fold((_) => null, (s) => s);
    }
    if (base == null) {
      state = const AsyncValue.data(null);
      return false;
    }

    final now = DateTime.now();
    final closedWithTime = base.copyWith(closedAt: now, closeNote: closeNote);
    final summaryResult = await _repository.computeShiftSummary(closedWithTime);
    final summarized = summaryResult.fold(
      (failure) => closedWithTime,
      (s) => s,
    );

    final finalShift = summarized.copyWith(
      cashCounted: cashCounted,
      // Selisih vs saldo harapan (opening + cash + income - expense), selaras web
      cashDifference: cashCounted - summarized.expectedBalance,
      closingBalance: cashCounted,
      closeNote: closeNote,
      closedAt: now,
    );

    final closeResult = await _repository.closeShift(finalShift);
    final ok = closeResult.fold((_) => false, (_) => true);
    state = AsyncValue.data(ok ? finalShift : base);
    _invalidate(cashierId);
    return ok;
  }

  void _invalidate(String cashierId) {
    _ref.invalidate(activeShiftProvider(cashierId));
    _ref.invalidate(shiftsListProvider);
  }
}

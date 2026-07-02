import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../data/repositories/cash_repository_impl.dart';
import '../../../domain/entities/cashier_shift.dart';

final cashBalanceProvider = FutureProvider<double>((ref) async {
  final repository = ref.read(cashRepositoryProvider);
  final result = await repository.getCashBalance();
  return result.fold((failure) => 0.0, (balance) => balance);
});

final cashTransactionsProvider = FutureProvider<List<CashTransaction>>((ref) async {
  final repository = ref.read(cashRepositoryProvider);
  final result = await repository.getCashTransactions();
  return result.fold((failure) => [], (transactions) => transactions);
});

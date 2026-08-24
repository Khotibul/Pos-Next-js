import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../data/repositories/report_repository_impl.dart';
import '../../../domain/entities/report.dart';

final dailyReportProvider = FutureProvider.family<DailyReport, DateTime>(
  (ref, date) async {
    final repository = ref.read(reportRepositoryProvider);
    final result = await repository.getDailyReport(date);
    return result.fold((failure) => DailyReport(date: date), (report) => report);
  },
);

final monthlyReportProvider = FutureProvider.family<MonthlyReport, Map<String, int>>(
  (ref, params) async {
    final repository = ref.read(reportRepositoryProvider);
    final result = await repository.getMonthlyReport(params['month']!, params['year']!);
    return result.fold(
      (failure) => MonthlyReport(month: params['month']!, year: params['year']!),
      (report) => report,
    );
  },
);

final topProductsProvider = FutureProvider<List<ProductReport>>((ref) async {
  final repository = ref.read(reportRepositoryProvider);
  final result = await repository.getTopProducts();
  return result.fold((failure) => [], (products) => products);
});

final periodReportProvider =
    FutureProvider.family<PeriodReport, (DateTime, DateTime)>((ref, range) async {
  final repository = ref.read(reportRepositoryProvider);
  final result = await repository.getPeriodReport(range.$1, range.$2);
  return result.fold(
    (failure) => PeriodReport(start: range.$1, end: range.$2),
    (report) => report,
  );
});

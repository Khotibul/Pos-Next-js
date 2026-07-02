import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../data/repositories/report_repository_impl.dart';
import '../../../domain/entities/report.dart';

final dashboardProvider = FutureProvider<DashboardData>((ref) async {
  final repository = ref.read(reportRepositoryProvider);
  final result = await repository.getDashboardData();
  return result.fold(
    (failure) => const DashboardData(),
    (data) => data,
  );
});

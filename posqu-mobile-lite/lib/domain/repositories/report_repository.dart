import 'package:dartz/dartz.dart' show Either;

import '../entities/report.dart';
import '../../core/errors/failures.dart';

abstract class ReportRepository {
  Future<Either<Failure, DashboardData>> getDashboardData();
  Future<Either<Failure, DailyReport>> getDailyReport(DateTime date);
  Future<Either<Failure, List<DailyReport>>> getWeeklyReport(DateTime startDate);
  Future<Either<Failure, MonthlyReport>> getMonthlyReport(int month, int year);
  Future<Either<Failure, List<ProductReport>>> getTopProducts({
    DateTime? startDate,
    DateTime? endDate,
    int limit = 10,
  });
  Future<Either<Failure, List<ProductReport>>> getLowStockReport();
}

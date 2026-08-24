import 'package:dartz/dartz.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/errors/failures.dart';
import '../../domain/entities/report.dart';
import '../../domain/repositories/report_repository.dart';
import '../datasources/local/database/app_database.dart';

final reportRepositoryProvider = Provider<ReportRepository>((ref) {
  return ReportRepositoryImpl(database: ref.read(appDatabaseProvider));
});

class ReportRepositoryImpl implements ReportRepository {
  final AppDatabase database;

  ReportRepositoryImpl({required this.database});

  @override
  Future<Either<Failure, DashboardData>> getDashboardData() async {
    try {
      final now = DateTime.now();
      final startOfDay = DateTime(now.year, now.month, now.day);

      final todaySalesList = await database.saleDao.getAll(
        startDate: startOfDay,
        endDate: now,
      );
      final todaySales =
          todaySalesList.fold<double>(0, (sum, sale) => sum + sale.total);
      final transactionCount = todaySalesList.length;

      double cashToday = 0;
      for (final sale in todaySalesList) {
        final payments = await database.paymentDao.getBySaleId(sale.id);
        if (payments.isNotEmpty &&
            payments.first.method.toLowerCase() == 'cash') {
          cashToday += sale.total;
        }
      }

      final totalProducts = await database.productDao.getCount();
      final lowStockProducts = (await database.productDao.getLowStock()).length;

      return Right(DashboardData(
        todaySales: todaySales,
        todayTransactions: transactionCount,
        totalProducts: totalProducts,
        lowStockProducts: lowStockProducts,
        cashInHand: cashToday,
      ));
    } catch (e) {
      return const Left(DatabaseFailure(message: 'Gagal memuat dashboard'));
    }
  }

  @override
  Future<Either<Failure, DailyReport>> getDailyReport(DateTime date) async {
    try {
      final startOfDay = DateTime(date.year, date.month, date.day);
      final endOfDay = startOfDay.add(const Duration(days: 1));

      final sales = await database.saleDao.getAll(
        startDate: startOfDay,
        endDate: endOfDay,
      );

      double totalSales = 0;
      double totalCash = 0;
      double totalQris = 0;
      double totalTransfer = 0;

      for (final sale in sales) {
        totalSales += sale.total;
        final payments = await database.paymentDao.getBySaleId(sale.id);
        final method =
            payments.isNotEmpty ? payments.first.method.toLowerCase() : 'cash';
        switch (method) {
          case 'cash':
            totalCash += sale.total;
            break;
          case 'qris':
            totalQris += sale.total;
            break;
          case 'transfer':
            totalTransfer += sale.total;
            break;
        }
      }

      return Right(DailyReport(
        date: date,
        totalSales: totalSales,
        transactionCount: sales.length,
        totalCash: totalCash,
        totalQris: totalQris,
        totalTransfer: totalTransfer,
      ));
    } catch (e) {
      return const Left(DatabaseFailure(message: 'Gagal memuat laporan harian'));
    }
  }

  @override
  Future<Either<Failure, List<DailyReport>>> getWeeklyReport(DateTime startDate) async {
    try {
      final reports = <DailyReport>[];
      for (int i = 0; i < 7; i++) {
        final date = startDate.add(Duration(days: i));
        final result = await getDailyReport(date);
        result.fold(
          (failure) => reports.add(DailyReport(date: date)),
          (report) => reports.add(report),
        );
      }
      return Right(reports);
    } catch (e) {
      return const Left(DatabaseFailure(message: 'Gagal memuat laporan mingguan'));
    }
  }

  @override
  Future<Either<Failure, MonthlyReport>> getMonthlyReport(int month, int year) async {
    try {
      final startOfMonth = DateTime(year, month, 1);
      final endOfMonth = DateTime(year, month + 1, 1);

      final sales = await database.saleDao.getAll(
        startDate: startOfMonth,
        endDate: endOfMonth,
      );

      double totalSales = 0;
      for (final sale in sales) {
        totalSales += sale.total;
      }

      return Right(MonthlyReport(
        month: month,
        year: year,
        totalSales: totalSales,
        transactionCount: sales.length,
      ));
    } catch (e) {
      return const Left(DatabaseFailure(message: 'Gagal memuat laporan bulanan'));
    }
  }

  @override
  Future<Either<Failure, List<ProductReport>>> getTopProducts({
    DateTime? startDate,
    DateTime? endDate,
    int limit = 10,
  }) async {
    try {
      final sales = await database.saleDao.getAll(
        startDate: startDate,
        endDate: endDate,
      );

      final productMap = <String, double>{};
      final productInfo = <String, String>{};
      final productName = <String, String>{};

      for (final sale in sales) {
        final items = await database.saleDao.getItems(sale.id);
        for (final item in items) {
          productMap[item.productId] =
              (productMap[item.productId] ?? 0) + item.qty;
          productInfo[item.productId] = item.name;
          productName[item.productId] = item.sku;
        }
      }

      final sorted = productMap.entries.toList()
        ..sort((a, b) => b.value.compareTo(a.value));

      final results = sorted.take(limit).map((e) => ProductReport(
        productId: e.key,
        productName: productInfo[e.key] ?? '',
        productCode: productName[e.key] ?? '',
        quantitySold: e.value,
      )).toList();

      return Right(results);
    } catch (e) {
      return const Left(DatabaseFailure(message: 'Gagal memuat produk terlaris'));
    }
  }

  @override
  Future<Either<Failure, List<ProductReport>>> getLowStockReport() async {
    try {
      final products = await database.productDao.getLowStock();
      return Right(products.map((p) => ProductReport(
        productId: p.id,
        productName: p.name,
        productCode: p.sku,
        stock: p.stock,
      )).toList());
    } catch (e) {
      return const Left(DatabaseFailure(message: 'Gagal memuat laporan stok'));
    }
  }


}

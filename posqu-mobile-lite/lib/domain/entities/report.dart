import 'package:equatable/equatable.dart';

class DailyReport extends Equatable {
  final DateTime date;
  final double totalSales;
  final int transactionCount;
  final double totalCash;
  final double totalQris;
  final double totalTransfer;
  final double totalExpenses;
  final double totalPurchases;
  final double totalReturns;
  final double grossProfit;
  final double netProfit;

  const DailyReport({
    required this.date,
    this.totalSales = 0,
    this.transactionCount = 0,
    this.totalCash = 0,
    this.totalQris = 0,
    this.totalTransfer = 0,
    this.totalExpenses = 0,
    this.totalPurchases = 0,
    this.totalReturns = 0,
    this.grossProfit = 0,
    this.netProfit = 0,
  });

  @override
  List<Object?> get props => [
        date,
        totalSales,
        transactionCount,
        totalCash,
        totalQris,
        totalTransfer,
        totalExpenses,
        totalPurchases,
        totalReturns,
        grossProfit,
        netProfit,
      ];
}

class MonthlyReport extends Equatable {
  final int month;
  final int year;
  final double totalSales;
  final int transactionCount;
  final double totalPurchases;
  final double totalExpenses;
  final double grossProfit;
  final double netProfit;

  const MonthlyReport({
    required this.month,
    required this.year,
    this.totalSales = 0,
    this.transactionCount = 0,
    this.totalPurchases = 0,
    this.totalExpenses = 0,
    this.grossProfit = 0,
    this.netProfit = 0,
  });

  @override
  List<Object?> get props => [
        month,
        year,
        totalSales,
        transactionCount,
        totalPurchases,
        totalExpenses,
        grossProfit,
        netProfit,
      ];
}

class ProductReport extends Equatable {
  final String productId;
  final String productName;
  final String productCode;
  final double quantitySold;
  final double totalRevenue;
  final double totalProfit;
  final int stock;

  const ProductReport({
    required this.productId,
    required this.productName,
    required this.productCode,
    this.quantitySold = 0,
    this.totalRevenue = 0,
    this.totalProfit = 0,
    this.stock = 0,
  });

  @override
  List<Object?> get props => [
        productId,
        productName,
        productCode,
        quantitySold,
        totalRevenue,
        totalProfit,
        stock,
      ];
}

class DashboardData extends Equatable {
  final double todaySales;
  final int todayTransactions;
  final int totalProducts;
  final int lowStockProducts;
  final double monthlySales;
  final double weeklyGrowth;
  final String? cashierShiftStatus;
  final double cashInHand;

  const DashboardData({
    this.todaySales = 0,
    this.todayTransactions = 0,
    this.totalProducts = 0,
    this.lowStockProducts = 0,
    this.monthlySales = 0,
    this.weeklyGrowth = 0,
    this.cashierShiftStatus,
    this.cashInHand = 0,
  });

  @override
  List<Object?> get props => [
        todaySales,
        todayTransactions,
        totalProducts,
        lowStockProducts,
        monthlySales,
        weeklyGrowth,
        cashierShiftStatus,
        cashInHand,
      ];
}

class PeriodReport extends Equatable {
  final DateTime start;
  final DateTime end;
  final double totalSales;
  final int transactionCount;
  final int itemsSold;
  final double grossProfit;
  final double totalCash;
  final double totalQris;
  final double totalTransfer;
  final double totalEwallet;
  final List<DailyReport> days;
  final List<PeriodTransaction> transactions;

  const PeriodReport({
    required this.start,
    required this.end,
    this.totalSales = 0,
    this.transactionCount = 0,
    this.itemsSold = 0,
    this.grossProfit = 0,
    this.totalCash = 0,
    this.totalQris = 0,
    this.totalTransfer = 0,
    this.totalEwallet = 0,
    this.days = const [],
    this.transactions = const [],
  });

  @override
  List<Object?> get props => [
        start,
        end,
        totalSales,
        transactionCount,
        itemsSold,
        grossProfit,
        totalCash,
        totalQris,
        totalTransfer,
        totalEwallet,
        days,
        transactions,
      ];
}

class PeriodTransaction extends Equatable {
  final String invoiceNo;
  final DateTime createdAt;
  final String status;
  final double subtotal;
  final double discount;
  final double tax;
  final double total;
  final String paymentMethod;

  const PeriodTransaction({
    required this.invoiceNo,
    required this.createdAt,
    this.status = 'PAID',
    this.subtotal = 0,
    this.discount = 0,
    this.tax = 0,
    required this.total,
    this.paymentMethod = 'cash',
  });

  @override
  List<Object?> get props => [
        invoiceNo,
        createdAt,
        status,
        subtotal,
        discount,
        tax,
        total,
        paymentMethod,
      ];
}

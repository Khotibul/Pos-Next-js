import 'package:equatable/equatable.dart';

class CashierShift extends Equatable {
  final int id;
  final int userId;
  final String? userName;
  final DateTime openTime;
  final DateTime? closeTime;
  final String status;
  final double openingBalance;
  final double closingBalance;
  final double expectedBalance;
  final double difference;
  final double totalSales;
  final double totalCash;
  final double totalQris;
  final double totalTransfer;
  final double totalExpenses;
  final String? notes;

  const CashierShift({
    required this.id,
    required this.userId,
    this.userName,
    required this.openTime,
    this.closeTime,
    required this.status,
    required this.openingBalance,
    this.closingBalance = 0,
    this.expectedBalance = 0,
    this.difference = 0,
    this.totalSales = 0,
    this.totalCash = 0,
    this.totalQris = 0,
    this.totalTransfer = 0,
    this.totalExpenses = 0,
    this.notes,
  });

  @override
  List<Object?> get props => [
        id,
        userId,
        userName,
        openTime,
        closeTime,
        status,
        openingBalance,
        closingBalance,
        expectedBalance,
        difference,
        totalSales,
        totalCash,
        totalQris,
        totalTransfer,
        totalExpenses,
        notes,
      ];
}

class CashTransaction extends Equatable {
  final int id;
  final int? shiftId;
  final String type;
  final String category;
  final double amount;
  final String? description;
  final String? referenceType;
  final int? referenceId;
  final DateTime transactionDate;
  final int userId;
  final DateTime createdAt;

  const CashTransaction({
    required this.id,
    this.shiftId,
    required this.type,
    required this.category,
    required this.amount,
    this.description,
    this.referenceType,
    this.referenceId,
    required this.transactionDate,
    required this.userId,
    required this.createdAt,
  });

  @override
  List<Object?> get props => [
        id,
        shiftId,
        type,
        category,
        amount,
        description,
        referenceType,
        referenceId,
        transactionDate,
        userId,
        createdAt,
      ];
}

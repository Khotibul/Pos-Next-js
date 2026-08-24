import 'package:equatable/equatable.dart';

class CashTransaction extends Equatable {
  final String id;
  final String? shiftId;
  final String type;
  final String category;
  final double amount;
  final String? description;
  final String? referenceType;
  final String? referenceId;
  final DateTime transactionDate;
  final String userId;
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

class CashierShift extends Equatable {
  final String id;
  final String? branchId;
  final String cashierId;
  final DateTime openedAt;
  final DateTime? closedAt;
  final String status;
  final double openingCash;
  final double cashSystem;
  final double? cashCounted;
  final double cashDifference;
  final double totalSales;
  final double totalCash;
  final double totalQris;
  final double totalTransfer;
  final double totalEwallet;
  final int transactionCount;
  final String? openNote;
  final String? closeNote;
  final String? approvedById;
  final DateTime? approvedAt;

  final double closingBalance;
  final double expectedBalance;
  final double totalExpenses;

  final bool isSynced;
  final DateTime createdAt;
  final DateTime updatedAt;

  const CashierShift({
    required this.id,
    this.branchId,
    required this.cashierId,
    required this.openedAt,
    this.closedAt,
    this.status = 'OPEN',
    this.openingCash = 0,
    this.cashSystem = 0,
    this.cashCounted,
    this.cashDifference = 0,
    this.totalSales = 0,
    this.totalCash = 0,
    this.totalQris = 0,
    this.totalTransfer = 0,
    this.totalEwallet = 0,
    this.transactionCount = 0,
    this.openNote,
    this.closeNote,
    this.approvedById,
    this.approvedAt,
    this.closingBalance = 0,
    this.expectedBalance = 0,
    this.totalExpenses = 0,
    this.isSynced = false,
    required this.createdAt,
    required this.updatedAt,
  });

  CashierShift copyWith({
    String? id,
    String? branchId,
    String? cashierId,
    DateTime? openedAt,
    DateTime? closedAt,
    String? status,
    double? openingCash,
    double? cashSystem,
    double? cashCounted,
    bool clearCashCounted = false,
    double? cashDifference,
    double? totalSales,
    double? totalCash,
    double? totalQris,
    double? totalTransfer,
    double? totalEwallet,
    int? transactionCount,
    String? openNote,
    String? closeNote,
    String? approvedById,
    DateTime? approvedAt,
    double? closingBalance,
    double? expectedBalance,
    double? totalExpenses,
    bool? isSynced,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return CashierShift(
      id: id ?? this.id,
      branchId: branchId ?? this.branchId,
      cashierId: cashierId ?? this.cashierId,
      openedAt: openedAt ?? this.openedAt,
      closedAt: closedAt ?? this.closedAt,
      status: status ?? this.status,
      openingCash: openingCash ?? this.openingCash,
      cashSystem: cashSystem ?? this.cashSystem,
      cashCounted: clearCashCounted ? null : (cashCounted ?? this.cashCounted),
      cashDifference: cashDifference ?? this.cashDifference,
      totalSales: totalSales ?? this.totalSales,
      totalCash: totalCash ?? this.totalCash,
      totalQris: totalQris ?? this.totalQris,
      totalTransfer: totalTransfer ?? this.totalTransfer,
      totalEwallet: totalEwallet ?? this.totalEwallet,
      transactionCount: transactionCount ?? this.transactionCount,
      openNote: openNote ?? this.openNote,
      closeNote: closeNote ?? this.closeNote,
      approvedById: approvedById ?? this.approvedById,
      approvedAt: approvedAt ?? this.approvedAt,
      closingBalance: closingBalance ?? this.closingBalance,
      expectedBalance: expectedBalance ?? this.expectedBalance,
      totalExpenses: totalExpenses ?? this.totalExpenses,
      isSynced: isSynced ?? this.isSynced,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  @override
  List<Object?> get props => [
        id,
        branchId,
        cashierId,
        openedAt,
        closedAt,
        status,
        openingCash,
        cashSystem,
        cashCounted,
        cashDifference,
        totalSales,
        totalCash,
        totalQris,
        totalTransfer,
        totalEwallet,
        transactionCount,
        openNote,
        closeNote,
        approvedById,
        approvedAt,
        closingBalance,
        expectedBalance,
        totalExpenses,
        isSynced,
        createdAt,
        updatedAt,
      ];
}

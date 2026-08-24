import 'package:json_annotation/json_annotation.dart';

import '../../domain/entities/cashier_shift.dart';

part 'cashier_shift_model.g.dart';

@JsonSerializable()
class CashierShiftModel {
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

  final double closingBalance;
  final double expectedBalance;
  final double totalExpenses;
  final DateTime createdAt;
  final DateTime updatedAt;

  const CashierShiftModel({
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
    this.closingBalance = 0,
    this.expectedBalance = 0,
    this.totalExpenses = 0,
    required this.createdAt,
    required this.updatedAt,
  });

  factory CashierShiftModel.fromJson(Map<String, dynamic> json) =>
      _$CashierShiftModelFromJson(json);

  Map<String, dynamic> toJson() => _$CashierShiftModelToJson(this);

  CashierShift toEntity() {
    return CashierShift(
      id: id,
      branchId: branchId,
      cashierId: cashierId,
      openedAt: openedAt,
      closedAt: closedAt,
      status: status,
      openingCash: openingCash,
      cashSystem: cashSystem,
      cashCounted: cashCounted,
      cashDifference: cashDifference,
      totalSales: totalSales,
      totalCash: totalCash,
      totalQris: totalQris,
      totalTransfer: totalTransfer,
      totalEwallet: totalEwallet,
      transactionCount: transactionCount,
      openNote: openNote,
      closeNote: closeNote,
      closingBalance: closingBalance,
      expectedBalance: expectedBalance,
      totalExpenses: totalExpenses,
      createdAt: createdAt,
      updatedAt: updatedAt,
    );
  }

  factory CashierShiftModel.fromEntity(CashierShift shift) {
    return CashierShiftModel(
      id: shift.id,
      branchId: shift.branchId,
      cashierId: shift.cashierId,
      openedAt: shift.openedAt,
      closedAt: shift.closedAt,
      status: shift.status,
      openingCash: shift.openingCash,
      cashSystem: shift.cashSystem,
      cashCounted: shift.cashCounted,
      cashDifference: shift.cashDifference,
      totalSales: shift.totalSales,
      totalCash: shift.totalCash,
      totalQris: shift.totalQris,
      totalTransfer: shift.totalTransfer,
      totalEwallet: shift.totalEwallet,
      transactionCount: shift.transactionCount,
      openNote: shift.openNote,
      closeNote: shift.closeNote,
      closingBalance: shift.closingBalance,
      expectedBalance: shift.expectedBalance,
      totalExpenses: shift.totalExpenses,
      createdAt: shift.createdAt,
      updatedAt: shift.updatedAt,
    );
  }
}

@JsonSerializable()
class CashTransactionModel {
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

  const CashTransactionModel({
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

  factory CashTransactionModel.fromJson(Map<String, dynamic> json) =>
      _$CashTransactionModelFromJson(json);

  Map<String, dynamic> toJson() => _$CashTransactionModelToJson(this);

  CashTransaction toEntity() {
    return CashTransaction(
      id: id,
      shiftId: shiftId,
      type: type,
      category: category,
      amount: amount,
      description: description,
      referenceType: referenceType,
      referenceId: referenceId,
      transactionDate: transactionDate,
      userId: userId,
      createdAt: createdAt,
    );
  }

  factory CashTransactionModel.fromEntity(CashTransaction t) {
    return CashTransactionModel(
      id: t.id,
      shiftId: t.shiftId,
      type: t.type,
      category: t.category,
      amount: t.amount,
      description: t.description,
      referenceType: t.referenceType,
      referenceId: t.referenceId,
      transactionDate: t.transactionDate,
      userId: t.userId,
      createdAt: t.createdAt,
    );
  }
}

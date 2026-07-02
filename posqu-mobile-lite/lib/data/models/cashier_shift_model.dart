import 'package:json_annotation/json_annotation.dart';

import '../../domain/entities/cashier_shift.dart';

part 'cashier_shift_model.g.dart';

@JsonSerializable()
class CashierShiftModel {
  final int id;
  @JsonKey(name: 'user_id')
  final int userId;
  @JsonKey(name: 'user_name')
  final String? userName;
  @JsonKey(name: 'open_time')
  final DateTime openTime;
  @JsonKey(name: 'close_time')
  final DateTime? closeTime;
  final String status;
  @JsonKey(name: 'opening_balance')
  final double openingBalance;
  @JsonKey(name: 'closing_balance')
  final double closingBalance;
  @JsonKey(name: 'expected_balance')
  final double expectedBalance;
  final double difference;
  @JsonKey(name: 'total_sales')
  final double totalSales;
  @JsonKey(name: 'total_cash')
  final double totalCash;
  @JsonKey(name: 'total_qris')
  final double totalQris;
  @JsonKey(name: 'total_transfer')
  final double totalTransfer;
  @JsonKey(name: 'total_expenses')
  final double totalExpenses;
  final String? notes;

  const CashierShiftModel({
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

  factory CashierShiftModel.fromJson(Map<String, dynamic> json) =>
      _$CashierShiftModelFromJson(json);

  Map<String, dynamic> toJson() => _$CashierShiftModelToJson(this);

  CashierShift toEntity() {
    return CashierShift(
      id: id,
      userId: userId,
      userName: userName,
      openTime: openTime,
      closeTime: closeTime,
      status: status,
      openingBalance: openingBalance,
      closingBalance: closingBalance,
      expectedBalance: expectedBalance,
      difference: difference,
      totalSales: totalSales,
      totalCash: totalCash,
      totalQris: totalQris,
      totalTransfer: totalTransfer,
      totalExpenses: totalExpenses,
      notes: notes,
    );
  }
}

@JsonSerializable()
class CashTransactionModel {
  final int id;
  @JsonKey(name: 'shift_id')
  final int? shiftId;
  final String type;
  final String category;
  final double amount;
  final String? description;
  @JsonKey(name: 'reference_type')
  final String? referenceType;
  @JsonKey(name: 'reference_id')
  final int? referenceId;
  @JsonKey(name: 'transaction_date')
  final DateTime transactionDate;
  @JsonKey(name: 'user_id')
  final int userId;
  @JsonKey(name: 'created_at')
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
}

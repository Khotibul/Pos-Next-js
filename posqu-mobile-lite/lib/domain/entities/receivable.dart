import 'package:equatable/equatable.dart';

class Receivable extends Equatable {
  final String id;
  final String? customerId;
  final String? customerName;
  final String? saleId;
  final String invoiceNo;
  final String? description;
  final double totalAmount;
  final double paidAmount;
  final double remainingAmount;
  final DateTime? dueDate;
  final String status;
  final String? notes;
  final List<ReceivablePayment> payments;
  final DateTime createdAt;
  final DateTime updatedAt;

  const Receivable({
    required this.id,
    this.customerId,
    this.customerName,
    this.saleId,
    required this.invoiceNo,
    this.description,
    this.totalAmount = 0,
    this.paidAmount = 0,
    this.remainingAmount = 0,
    this.dueDate,
    this.status = 'UNPAID',
    this.notes,
    this.payments = const [],
    required this.createdAt,
    required this.updatedAt,
  });

  @override
  List<Object?> get props => [
        id, customerId, customerName, saleId, invoiceNo, description,
        totalAmount, paidAmount, remainingAmount, dueDate, status, notes,
        payments, createdAt, updatedAt,
      ];
}

class ReceivablePayment extends Equatable {
  final String id;
  final String receivableId;
  final double amount;
  final String method;
  final String? reference;
  final String? notes;
  final DateTime paidAt;
  final DateTime createdAt;

  const ReceivablePayment({
    required this.id,
    required this.receivableId,
    this.amount = 0,
    this.method = 'CASH',
    this.reference,
    this.notes,
    required this.paidAt,
    required this.createdAt,
  });

  @override
  List<Object?> get props => [id, receivableId, amount, method, reference, notes, paidAt, createdAt];
}

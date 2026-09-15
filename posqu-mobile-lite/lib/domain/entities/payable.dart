import 'package:equatable/equatable.dart';

class Payable extends Equatable {
  final String id;
  final String? supplierId;
  final String? supplierName;
  final String? purchaseOrderId;
  final String invoiceNo;
  final String? description;
  final double totalAmount;
  final double paidAmount;
  final double remainingAmount;
  final DateTime? dueDate;
  final String status;
  final String? notes;
  final List<PayablePayment> payments;
  final DateTime createdAt;
  final DateTime updatedAt;

  const Payable({
    required this.id,
    this.supplierId,
    this.supplierName,
    this.purchaseOrderId,
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
        id, supplierId, supplierName, purchaseOrderId, invoiceNo, description,
        totalAmount, paidAmount, remainingAmount, dueDate, status, notes,
        payments, createdAt, updatedAt,
      ];
}

class PayablePayment extends Equatable {
  final String id;
  final String payableId;
  final double amount;
  final String method;
  final String? reference;
  final String? notes;
  final DateTime paidAt;
  final DateTime createdAt;

  const PayablePayment({
    required this.id,
    required this.payableId,
    this.amount = 0,
    this.method = 'CASH',
    this.reference,
    this.notes,
    required this.paidAt,
    required this.createdAt,
  });

  @override
  List<Object?> get props => [id, payableId, amount, method, reference, notes, paidAt, createdAt];
}

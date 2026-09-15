import 'package:json_annotation/json_annotation.dart';
import '../../domain/entities/payable.dart';

part 'payable_model.g.dart';

@JsonSerializable()
class PayableModel {
  final String id;
  final String? supplierId;
  final String? supplierName;
  final String? purchaseOrderId;
  final String invoiceNo;
  final String? description;
  final double totalAmount;
  final double paidAmount;
  final double remainingAmount;
  final String? dueDate;
  final String status;
  final String? notes;
  final List<PayablePaymentModel> payments;
  final String? createdAt;
  final String? updatedAt;

  const PayableModel({
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
    this.createdAt,
    this.updatedAt,
  });

  factory PayableModel.fromJson(Map<String, dynamic> json) =>
      _$PayableModelFromJson(json);

  Map<String, dynamic> toJson() => _$PayableModelToJson(this);

  Payable toEntity() {
    return Payable(
      id: id,
      supplierId: supplierId,
      supplierName: supplierName,
      purchaseOrderId: purchaseOrderId,
      invoiceNo: invoiceNo,
      description: description,
      totalAmount: totalAmount,
      paidAmount: paidAmount,
      remainingAmount: remainingAmount,
      dueDate: dueDate != null ? DateTime.tryParse(dueDate!) : null,
      status: status,
      notes: notes,
      payments: payments.map((e) => e.toEntity()).toList(),
      createdAt: createdAt != null ? DateTime.tryParse(createdAt!) ?? DateTime.now() : DateTime.now(),
      updatedAt: updatedAt != null ? DateTime.tryParse(updatedAt!) ?? DateTime.now() : DateTime.now(),
    );
  }

  factory PayableModel.fromEntity(Payable p) {
    return PayableModel(
      id: p.id,
      supplierId: p.supplierId,
      supplierName: p.supplierName,
      purchaseOrderId: p.purchaseOrderId,
      invoiceNo: p.invoiceNo,
      description: p.description,
      totalAmount: p.totalAmount,
      paidAmount: p.paidAmount,
      remainingAmount: p.remainingAmount,
      dueDate: p.dueDate?.toIso8601String(),
      status: p.status,
      notes: p.notes,
      payments: p.payments.map((e) => PayablePaymentModel.fromEntity(e)).toList(),
      createdAt: p.createdAt.toIso8601String(),
      updatedAt: p.updatedAt.toIso8601String(),
    );
  }
}

@JsonSerializable()
class PayablePaymentModel {
  final String id;
  final String payableId;
  final double amount;
  final String method;
  final String? reference;
  final String? notes;
  final String? paidAt;
  final String? createdAt;

  const PayablePaymentModel({
    required this.id,
    required this.payableId,
    this.amount = 0,
    this.method = 'CASH',
    this.reference,
    this.notes,
    this.paidAt,
    this.createdAt,
  });

  factory PayablePaymentModel.fromJson(Map<String, dynamic> json) =>
      _$PayablePaymentModelFromJson(json);

  Map<String, dynamic> toJson() => _$PayablePaymentModelToJson(this);

  PayablePayment toEntity() {
    return PayablePayment(
      id: id,
      payableId: payableId,
      amount: amount,
      method: method,
      reference: reference,
      notes: notes,
      paidAt: paidAt != null ? DateTime.tryParse(paidAt!) ?? DateTime.now() : DateTime.now(),
      createdAt: createdAt != null ? DateTime.tryParse(createdAt!) ?? DateTime.now() : DateTime.now(),
    );
  }

  factory PayablePaymentModel.fromEntity(PayablePayment p) {
    return PayablePaymentModel(
      id: p.id,
      payableId: p.payableId,
      amount: p.amount,
      method: p.method,
      reference: p.reference,
      notes: p.notes,
      paidAt: p.paidAt.toIso8601String(),
      createdAt: p.createdAt.toIso8601String(),
    );
  }
}

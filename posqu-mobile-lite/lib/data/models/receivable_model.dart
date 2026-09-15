import 'package:json_annotation/json_annotation.dart';
import '../../domain/entities/receivable.dart';

part 'receivable_model.g.dart';

@JsonSerializable()
class ReceivableModel {
  final String id;
  final String? customerId;
  final String? customerName;
  final String? saleId;
  final String invoiceNo;
  final String? description;
  final double totalAmount;
  final double paidAmount;
  final double remainingAmount;
  final String? dueDate;
  final String status;
  final String? notes;
  final List<ReceivablePaymentModel> payments;
  final String? createdAt;
  final String? updatedAt;

  const ReceivableModel({
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
    this.createdAt,
    this.updatedAt,
  });

  factory ReceivableModel.fromJson(Map<String, dynamic> json) =>
      _$ReceivableModelFromJson(json);

  Map<String, dynamic> toJson() => _$ReceivableModelToJson(this);

  Receivable toEntity() {
    return Receivable(
      id: id,
      customerId: customerId,
      customerName: customerName,
      saleId: saleId,
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

  factory ReceivableModel.fromEntity(Receivable r) {
    return ReceivableModel(
      id: r.id,
      customerId: r.customerId,
      customerName: r.customerName,
      saleId: r.saleId,
      invoiceNo: r.invoiceNo,
      description: r.description,
      totalAmount: r.totalAmount,
      paidAmount: r.paidAmount,
      remainingAmount: r.remainingAmount,
      dueDate: r.dueDate?.toIso8601String(),
      status: r.status,
      notes: r.notes,
      payments: r.payments.map((e) => ReceivablePaymentModel.fromEntity(e)).toList(),
      createdAt: r.createdAt.toIso8601String(),
      updatedAt: r.updatedAt.toIso8601String(),
    );
  }
}

@JsonSerializable()
class ReceivablePaymentModel {
  final String id;
  final String receivableId;
  final double amount;
  final String method;
  final String? reference;
  final String? notes;
  final String? paidAt;
  final String? createdAt;

  const ReceivablePaymentModel({
    required this.id,
    required this.receivableId,
    this.amount = 0,
    this.method = 'CASH',
    this.reference,
    this.notes,
    this.paidAt,
    this.createdAt,
  });

  factory ReceivablePaymentModel.fromJson(Map<String, dynamic> json) =>
      _$ReceivablePaymentModelFromJson(json);

  Map<String, dynamic> toJson() => _$ReceivablePaymentModelToJson(this);

  ReceivablePayment toEntity() {
    return ReceivablePayment(
      id: id,
      receivableId: receivableId,
      amount: amount,
      method: method,
      reference: reference,
      notes: notes,
      paidAt: paidAt != null ? DateTime.tryParse(paidAt!) ?? DateTime.now() : DateTime.now(),
      createdAt: createdAt != null ? DateTime.tryParse(createdAt!) ?? DateTime.now() : DateTime.now(),
    );
  }

  factory ReceivablePaymentModel.fromEntity(ReceivablePayment p) {
    return ReceivablePaymentModel(
      id: p.id,
      receivableId: p.receivableId,
      amount: p.amount,
      method: p.method,
      reference: p.reference,
      notes: p.notes,
      paidAt: p.paidAt.toIso8601String(),
      createdAt: p.createdAt.toIso8601String(),
    );
  }
}

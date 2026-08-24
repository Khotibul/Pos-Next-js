import 'package:json_annotation/json_annotation.dart';

import '../../domain/entities/return.dart' as domain;

part 'return_model.g.dart';

@JsonSerializable()
class ReturnModel {
  final String id;
  final String returnNumber;
  final String? saleId;
  final String? saleInvoice;
  final String? purchaseId;
  final String? purchaseInvoice;
  final String type;
  final String userId;
  final String? userName;
  final String? customerId;
  final String? customerName;
  final String? supplierId;
  final String? supplierName;
  final DateTime returnDate;
  final String reason;
  final String status;
  final double total;
  final String? notes;
  final List<ReturnItemModel> items;
  final DateTime createdAt;
  final DateTime updatedAt;

  const ReturnModel({
    required this.id,
    required this.returnNumber,
    this.saleId,
    this.saleInvoice,
    this.purchaseId,
    this.purchaseInvoice,
    required this.type,
    required this.userId,
    this.userName,
    this.customerId,
    this.customerName,
    this.supplierId,
    this.supplierName,
    required this.returnDate,
    required this.reason,
    required this.status,
    required this.total,
    this.notes,
    this.items = const [],
    required this.createdAt,
    required this.updatedAt,
  });

  factory ReturnModel.fromJson(Map<String, dynamic> json) =>
      _$ReturnModelFromJson(json);

  Map<String, dynamic> toJson() => _$ReturnModelToJson(this);

  domain.Return toEntity() {
    return domain.Return(
      id: id,
      returnNumber: returnNumber,
      saleId: saleId,
      saleInvoice: saleInvoice,
      purchaseId: purchaseId,
      purchaseInvoice: purchaseInvoice,
      type: type,
      userId: userId,
      userName: userName,
      customerId: customerId,
      customerName: customerName,
      supplierId: supplierId,
      supplierName: supplierName,
      returnDate: returnDate,
      reason: reason,
      status: status,
      total: total,
      notes: notes,
      items: items.map((e) => e.toEntity()).toList(),
      createdAt: createdAt,
      updatedAt: updatedAt,
    );
  }

  factory ReturnModel.fromEntity(domain.Return r) {
    return ReturnModel(
      id: r.id,
      returnNumber: r.returnNumber,
      saleId: r.saleId,
      saleInvoice: r.saleInvoice,
      purchaseId: r.purchaseId,
      purchaseInvoice: r.purchaseInvoice,
      type: r.type,
      userId: r.userId,
      userName: r.userName,
      customerId: r.customerId,
      customerName: r.customerName,
      supplierId: r.supplierId,
      supplierName: r.supplierName,
      returnDate: r.returnDate,
      reason: r.reason,
      status: r.status,
      total: r.total,
      notes: r.notes,
      items: r.items.map((i) => ReturnItemModel.fromEntity(i)).toList(),
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    );
  }
}

@JsonSerializable()
class ReturnItemModel {
  final String id;
  final String returnId;
  final String productId;
  final String? productName;
  final String? productCode;
  final double quantity;
  final double price;
  final double subtotal;
  final String reason;

  const ReturnItemModel({
    required this.id,
    required this.returnId,
    required this.productId,
    this.productName,
    this.productCode,
    required this.quantity,
    required this.price,
    required this.subtotal,
    required this.reason,
  });

  factory ReturnItemModel.fromJson(Map<String, dynamic> json) =>
      _$ReturnItemModelFromJson(json);

  Map<String, dynamic> toJson() => _$ReturnItemModelToJson(this);

  domain.ReturnItem toEntity() {
    return domain.ReturnItem(
      id: id,
      returnId: returnId,
      productId: productId,
      productName: productName,
      productCode: productCode,
      quantity: quantity,
      price: price,
      subtotal: subtotal,
      reason: reason,
    );
  }

  factory ReturnItemModel.fromEntity(domain.ReturnItem item) {
    return ReturnItemModel(
      id: item.id,
      returnId: item.returnId,
      productId: item.productId,
      productName: item.productName,
      productCode: item.productCode,
      quantity: item.quantity,
      price: item.price,
      subtotal: item.subtotal,
      reason: item.reason,
    );
  }
}

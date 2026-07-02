import 'package:json_annotation/json_annotation.dart';

import '../../domain/entities/return.dart' as domain;

part 'return_model.g.dart';

@JsonSerializable()
class ReturnModel {
  final int id;
  @JsonKey(name: 'return_number')
  final String returnNumber;
  @JsonKey(name: 'sale_id')
  final int? saleId;
  @JsonKey(name: 'sale_invoice')
  final String? saleInvoice;
  @JsonKey(name: 'purchase_id')
  final int? purchaseId;
  @JsonKey(name: 'purchase_invoice')
  final String? purchaseInvoice;
  final String type;
  @JsonKey(name: 'user_id')
  final int userId;
  @JsonKey(name: 'user_name')
  final String? userName;
  @JsonKey(name: 'customer_id')
  final int? customerId;
  @JsonKey(name: 'customer_name')
  final String? customerName;
  @JsonKey(name: 'supplier_id')
  final int? supplierId;
  @JsonKey(name: 'supplier_name')
  final String? supplierName;
  @JsonKey(name: 'return_date')
  final DateTime returnDate;
  final String reason;
  final String status;
  final double total;
  final String? notes;
  final List<ReturnItemModel> items;
  @JsonKey(name: 'created_at')
  final DateTime createdAt;
  @JsonKey(name: 'updated_at')
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
}

@JsonSerializable()
class ReturnItemModel {
  final int id;
  @JsonKey(name: 'return_id')
  final int returnId;
  @JsonKey(name: 'product_id')
  final int productId;
  @JsonKey(name: 'product_name')
  final String? productName;
  @JsonKey(name: 'product_code')
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
}

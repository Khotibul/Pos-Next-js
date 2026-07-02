import 'package:json_annotation/json_annotation.dart';

import '../../domain/entities/purchase.dart';

part 'purchase_model.g.dart';

@JsonSerializable()
class PurchaseModel {
  final int id;
  @JsonKey(name: 'invoice_number')
  final String invoiceNumber;
  @JsonKey(name: 'supplier_id')
  final int supplierId;
  @JsonKey(name: 'supplier_name')
  final String? supplierName;
  @JsonKey(name: 'user_id')
  final int userId;
  @JsonKey(name: 'user_name')
  final String? userName;
  @JsonKey(name: 'purchase_date')
  final DateTime purchaseDate;
  final String status;
  final double subtotal;
  final double discount;
  final double tax;
  final double total;
  final String? notes;
  final List<PurchaseItemModel> items;
  @JsonKey(name: 'created_at')
  final DateTime createdAt;
  @JsonKey(name: 'updated_at')
  final DateTime updatedAt;

  const PurchaseModel({
    required this.id,
    required this.invoiceNumber,
    required this.supplierId,
    this.supplierName,
    required this.userId,
    this.userName,
    required this.purchaseDate,
    required this.status,
    required this.subtotal,
    this.discount = 0,
    this.tax = 0,
    required this.total,
    this.notes,
    this.items = const [],
    required this.createdAt,
    required this.updatedAt,
  });

  factory PurchaseModel.fromJson(Map<String, dynamic> json) =>
      _$PurchaseModelFromJson(json);

  Map<String, dynamic> toJson() => _$PurchaseModelToJson(this);

  Purchase toEntity() {
    return Purchase(
      id: id,
      invoiceNumber: invoiceNumber,
      supplierId: supplierId,
      supplierName: supplierName,
      userId: userId,
      userName: userName,
      purchaseDate: purchaseDate,
      status: status,
      subtotal: subtotal,
      discount: discount,
      tax: tax,
      total: total,
      notes: notes,
      items: items.map((e) => e.toEntity()).toList(),
      createdAt: createdAt,
      updatedAt: updatedAt,
    );
  }
}

@JsonSerializable()
class PurchaseItemModel {
  final int id;
  @JsonKey(name: 'purchase_id')
  final int purchaseId;
  @JsonKey(name: 'product_id')
  final int productId;
  @JsonKey(name: 'product_name')
  final String? productName;
  @JsonKey(name: 'product_code')
  final String? productCode;
  final String? barcode;
  final double quantity;
  @JsonKey(name: 'purchase_price')
  final double purchasePrice;
  final double subtotal;
  final int? unit;

  const PurchaseItemModel({
    required this.id,
    required this.purchaseId,
    required this.productId,
    this.productName,
    this.productCode,
    this.barcode,
    required this.quantity,
    required this.purchasePrice,
    required this.subtotal,
    this.unit,
  });

  factory PurchaseItemModel.fromJson(Map<String, dynamic> json) =>
      _$PurchaseItemModelFromJson(json);

  Map<String, dynamic> toJson() => _$PurchaseItemModelToJson(this);

  PurchaseItem toEntity() {
    return PurchaseItem(
      id: id,
      purchaseId: purchaseId,
      productId: productId,
      productName: productName,
      productCode: productCode,
      barcode: barcode,
      quantity: quantity,
      purchasePrice: purchasePrice,
      subtotal: subtotal,
      unit: unit,
    );
  }
}

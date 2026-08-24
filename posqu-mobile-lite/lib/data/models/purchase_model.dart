import 'package:json_annotation/json_annotation.dart';

import '../../domain/entities/purchase.dart';

part 'purchase_model.g.dart';

@JsonSerializable()
class PurchaseModel {
  final String id;
  final String orderNo;
  final String? supplierId;
  final String? supplierName;
  final String status;
  final String? notes;
  final double subtotal;
  final double tax;
  final double total;
  final List<PurchaseItemModel> items;
  final DateTime createdAt;
  final DateTime updatedAt;

  const PurchaseModel({
    required this.id,
    required this.orderNo,
    this.supplierId,
    this.supplierName,
    this.status = 'DRAFT',
    this.notes,
    required this.subtotal,
    this.tax = 0,
    required this.total,
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
      orderNo: orderNo,
      supplierId: supplierId,
      supplierName: supplierName,
      status: status,
      notes: notes,
      subtotal: subtotal,
      tax: tax,
      total: total,
      items: items.map((e) => e.toEntity()).toList(),
      createdAt: createdAt,
      updatedAt: updatedAt,
    );
  }

  factory PurchaseModel.fromEntity(Purchase purchase) {
    return PurchaseModel(
      id: purchase.id,
      orderNo: purchase.orderNo,
      supplierId: purchase.supplierId,
      supplierName: purchase.supplierName,
      status: purchase.status,
      notes: purchase.notes,
      subtotal: purchase.subtotal,
      tax: purchase.tax,
      total: purchase.total,
      items: purchase.items.map((i) => PurchaseItemModel.fromEntity(i)).toList(),
      createdAt: purchase.createdAt,
      updatedAt: purchase.updatedAt,
    );
  }
}

@JsonSerializable()
class PurchaseItemModel {
  final String id;
  final String purchaseOrderId;
  final String productId;
  final String name;
  final String sku;
  final double qty;
  final double costPrice;
  final double lineTotal;

  const PurchaseItemModel({
    required this.id,
    required this.purchaseOrderId,
    required this.productId,
    this.name = '',
    this.sku = '',
    required this.qty,
    required this.costPrice,
    required this.lineTotal,
  });

  factory PurchaseItemModel.fromJson(Map<String, dynamic> json) =>
      _$PurchaseItemModelFromJson(json);

  Map<String, dynamic> toJson() => _$PurchaseItemModelToJson(this);

  PurchaseItem toEntity() {
    return PurchaseItem(
      id: id,
      purchaseOrderId: purchaseOrderId,
      productId: productId,
      name: name,
      sku: sku,
      qty: qty,
      costPrice: costPrice,
      lineTotal: lineTotal,
    );
  }

  factory PurchaseItemModel.fromEntity(PurchaseItem item) {
    return PurchaseItemModel(
      id: item.id,
      purchaseOrderId: item.purchaseOrderId,
      productId: item.productId,
      name: item.name,
      sku: item.sku,
      qty: item.qty,
      costPrice: item.costPrice,
      lineTotal: item.lineTotal,
    );
  }
}

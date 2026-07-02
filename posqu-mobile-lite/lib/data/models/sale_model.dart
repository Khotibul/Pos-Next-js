import 'package:json_annotation/json_annotation.dart';

import '../../domain/entities/sale.dart';

part 'sale_model.g.dart';

@JsonSerializable()
class SaleModel {
  final int id;
  @JsonKey(name: 'invoice_number')
  final String invoiceNumber;
  @JsonKey(name: 'customer_id')
  final int? customerId;
  @JsonKey(name: 'customer_name')
  final String? customerName;
  @JsonKey(name: 'user_id')
  final int userId;
  @JsonKey(name: 'user_name')
  final String? userName;
  @JsonKey(name: 'sale_date')
  final DateTime saleDate;
  final String status;
  @JsonKey(name: 'payment_method')
  final String paymentMethod;
  @JsonKey(name: 'payment_reference')
  final String? paymentReference;
  final double subtotal;
  final double discount;
  final double tax;
  final double total;
  @JsonKey(name: 'paid_amount')
  final double paidAmount;
  @JsonKey(name: 'change_amount')
  final double changeAmount;
  final String? notes;
  final List<SaleItemModel> items;
  @JsonKey(name: 'created_at')
  final DateTime createdAt;
  @JsonKey(name: 'updated_at')
  final DateTime updatedAt;

  const SaleModel({
    required this.id,
    required this.invoiceNumber,
    this.customerId,
    this.customerName,
    required this.userId,
    this.userName,
    required this.saleDate,
    required this.status,
    required this.paymentMethod,
    this.paymentReference,
    required this.subtotal,
    this.discount = 0,
    this.tax = 0,
    required this.total,
    required this.paidAmount,
    this.changeAmount = 0,
    this.notes,
    this.items = const [],
    required this.createdAt,
    required this.updatedAt,
  });

  factory SaleModel.fromJson(Map<String, dynamic> json) =>
      _$SaleModelFromJson(json);

  Map<String, dynamic> toJson() => _$SaleModelToJson(this);

  Sale toEntity() {
    return Sale(
      id: id,
      invoiceNumber: invoiceNumber,
      customerId: customerId,
      customerName: customerName,
      userId: userId,
      userName: userName,
      saleDate: saleDate,
      status: status,
      paymentMethod: paymentMethod,
      paymentReference: paymentReference,
      subtotal: subtotal,
      discount: discount,
      tax: tax,
      total: total,
      paidAmount: paidAmount,
      changeAmount: changeAmount,
      notes: notes,
      items: items.map((e) => e.toEntity()).toList(),
      createdAt: createdAt,
      updatedAt: updatedAt,
    );
  }
}

@JsonSerializable()
class SaleItemModel {
  final int id;
  @JsonKey(name: 'sale_id')
  final int saleId;
  @JsonKey(name: 'product_id')
  final int productId;
  @JsonKey(name: 'product_name')
  final String? productName;
  @JsonKey(name: 'product_code')
  final String? productCode;
  final String? barcode;
  final double quantity;
  @JsonKey(name: 'selling_price')
  final double sellingPrice;
  final double discount;
  final double subtotal;
  final String? unit;

  const SaleItemModel({
    required this.id,
    required this.saleId,
    required this.productId,
    this.productName,
    this.productCode,
    this.barcode,
    required this.quantity,
    required this.sellingPrice,
    this.discount = 0,
    required this.subtotal,
    this.unit,
  });

  factory SaleItemModel.fromJson(Map<String, dynamic> json) =>
      _$SaleItemModelFromJson(json);

  Map<String, dynamic> toJson() => _$SaleItemModelToJson(this);

  SaleItem toEntity() {
    return SaleItem(
      id: id,
      saleId: saleId,
      productId: productId,
      productName: productName,
      productCode: productCode,
      barcode: barcode,
      quantity: quantity,
      sellingPrice: sellingPrice,
      discount: discount,
      subtotal: subtotal,
      unit: unit,
    );
  }
}

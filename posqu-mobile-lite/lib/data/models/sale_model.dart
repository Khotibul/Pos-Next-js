import 'package:json_annotation/json_annotation.dart';

import '../../domain/entities/sale.dart';

part 'sale_model.g.dart';

@JsonSerializable()
class SaleModel {
  final String id;
  final String invoiceNo;
  final String? cashierId;
  final String? cashierName;
  final String? shiftId;
  final String? customerId;
  final String? customerName;
  final String status;
  final String paymentMethod;
  final String? paymentReference;
  final double subtotal;
  final double discount;
  final double tax;
  final double total;
  final double paidAmount;
  final double changeAmount;
  final String? notes;
  final List<SaleItemModel> items;
  final DateTime createdAt;
  final DateTime updatedAt;

  const SaleModel({
    required this.id,
    required this.invoiceNo,
    this.cashierId,
    this.cashierName,
    this.shiftId,
    this.customerId,
    this.customerName,
    this.status = 'PAID',
    this.paymentMethod = 'cash',
    this.paymentReference,
    required this.subtotal,
    this.discount = 0,
    this.tax = 0,
    required this.total,
    this.paidAmount = 0,
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
      invoiceNo: invoiceNo,
      cashierId: cashierId,
      cashierName: cashierName,
      shiftId: shiftId,
      customerId: customerId,
      customerName: customerName,
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

  factory SaleModel.fromEntity(Sale sale) {
    return SaleModel(
      id: sale.id,
      invoiceNo: sale.invoiceNo,
      cashierId: sale.cashierId,
      cashierName: sale.cashierName,
      shiftId: sale.shiftId,
      customerId: sale.customerId,
      customerName: sale.customerName,
      status: sale.status,
      paymentMethod: sale.paymentMethod,
      paymentReference: sale.paymentReference,
      subtotal: sale.subtotal,
      discount: sale.discount,
      tax: sale.tax,
      total: sale.total,
      paidAmount: sale.paidAmount,
      changeAmount: sale.changeAmount,
      notes: sale.notes,
      items: sale.items.map((i) => SaleItemModel.fromEntity(i)).toList(),
      createdAt: sale.createdAt,
      updatedAt: sale.updatedAt,
    );
  }
}

@JsonSerializable()
class SaleItemModel {
  final String id;
  final String saleId;
  final String productId;
  final String name;
  final String sku;
  final String? barcode;
  final double qty;
  final double price;
  final double lineTotal;
  final String? unit;

  const SaleItemModel({
    required this.id,
    required this.saleId,
    required this.productId,
    this.name = '',
    this.sku = '',
    this.barcode,
    required this.qty,
    required this.price,
    required this.lineTotal,
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
      name: name,
      sku: sku,
      barcode: barcode,
      qty: qty,
      price: price,
      lineTotal: lineTotal,
      unit: unit,
    );
  }

  factory SaleItemModel.fromEntity(SaleItem item) {
    return SaleItemModel(
      id: item.id,
      saleId: item.saleId,
      productId: item.productId,
      name: item.name,
      sku: item.sku,
      barcode: item.barcode,
      qty: item.qty,
      price: item.price,
      lineTotal: item.lineTotal,
      unit: item.unit,
    );
  }
}

@JsonSerializable()
class PaymentModel {
  final String id;
  final String saleId;
  final String method;
  final double amount;
  final double receivedAmount;
  final double changeAmount;
  final String? reference;
  final DateTime createdAt;

  const PaymentModel({
    required this.id,
    required this.saleId,
    required this.method,
    required this.amount,
    this.receivedAmount = 0,
    this.changeAmount = 0,
    this.reference,
    required this.createdAt,
  });

  factory PaymentModel.fromJson(Map<String, dynamic> json) =>
      _$PaymentModelFromJson(json);

  Map<String, dynamic> toJson() => _$PaymentModelToJson(this);
}

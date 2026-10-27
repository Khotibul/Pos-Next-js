import 'package:equatable/equatable.dart';

class Sale extends Equatable {
  final String id;
  final String invoiceNo;
  final String? cashierId;
  final String? cashierName;
  final String? shiftId;
  final String? customerId;
  final String? customerName;
  final DateTime createdAt;
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
  final List<SaleItem> items;
  final DateTime updatedAt;

  const Sale({
    required this.id,
    required this.invoiceNo,
    this.cashierId,
    this.cashierName,
    this.shiftId,
    this.customerId,
    this.customerName,
    required this.createdAt,
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
    required this.updatedAt,
  });

  @override
  List<Object?> get props => [
        id,
        invoiceNo,
        cashierId,
        cashierName,
        shiftId,
        customerId,
        customerName,
        createdAt,
        status,
        paymentMethod,
        paymentReference,
        subtotal,
        discount,
        tax,
        total,
        paidAmount,
        changeAmount,
        notes,
        items,
        updatedAt,
      ];
}

class SaleItem extends Equatable {
  final String id;
  final String saleId;
  final String productId;
  final String? variantId;
  final String? variantName;
  final String name;
  final String sku;
  final String? barcode;
  final double qty;
  final double price;
  final double lineTotal;
  final String? unit;
  final bool priceOverridden;

  const SaleItem({
    required this.id,
    required this.saleId,
    required this.productId,
    this.variantId,
    this.variantName,
    this.name = '',
    this.sku = '',
    this.barcode,
    required this.qty,
    required this.price,
    required this.lineTotal,
    this.unit,
    this.priceOverridden = false,
  });

  String get displayName => variantName == null || variantName!.isEmpty
      ? name
      : '$name ($variantName)';

  SaleItem copyWith({
    String? id,
    String? saleId,
    String? productId,
    String? variantId,
    String? variantName,
    String? name,
    String? sku,
    String? barcode,
    double? qty,
    double? price,
    double? lineTotal,
    String? unit,
    bool? priceOverridden,
  }) {
    return SaleItem(
      id: id ?? this.id,
      saleId: saleId ?? this.saleId,
      productId: productId ?? this.productId,
      variantId: variantId ?? this.variantId,
      variantName: variantName ?? this.variantName,
      name: name ?? this.name,
      sku: sku ?? this.sku,
      barcode: barcode ?? this.barcode,
      qty: qty ?? this.qty,
      price: price ?? this.price,
      lineTotal: lineTotal ?? this.lineTotal,
      unit: unit ?? this.unit,
      priceOverridden: priceOverridden ?? this.priceOverridden,
    );
  }

  @override
  List<Object?> get props => [
        id,
        saleId,
        productId,
        variantId,
        variantName,
        name,
        sku,
        barcode,
        qty,
        price,
        lineTotal,
        unit,
        priceOverridden,
      ];
}

import 'package:equatable/equatable.dart';

class Sale extends Equatable {
  final int id;
  final String invoiceNumber;
  final int? customerId;
  final String? customerName;
  final int userId;
  final String? userName;
  final DateTime saleDate;
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
  final DateTime createdAt;
  final DateTime updatedAt;

  const Sale({
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

  @override
  List<Object?> get props => [
        id,
        invoiceNumber,
        customerId,
        customerName,
        userId,
        userName,
        saleDate,
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
        createdAt,
        updatedAt,
      ];
}

class SaleItem extends Equatable {
  final int id;
  final int saleId;
  final int productId;
  final String? productName;
  final String? productCode;
  final String? barcode;
  final double quantity;
  final double sellingPrice;
  final double discount;
  final double subtotal;
  final String? unit;

  const SaleItem({
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

  @override
  List<Object?> get props => [
        id,
        saleId,
        productId,
        productName,
        productCode,
        barcode,
        quantity,
        sellingPrice,
        discount,
        subtotal,
        unit,
      ];
}

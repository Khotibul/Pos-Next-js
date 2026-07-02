import 'package:equatable/equatable.dart';

class Purchase extends Equatable {
  final int id;
  final String invoiceNumber;
  final int supplierId;
  final String? supplierName;
  final int userId;
  final String? userName;
  final DateTime purchaseDate;
  final String status;
  final double subtotal;
  final double discount;
  final double tax;
  final double total;
  final String? notes;
  final List<PurchaseItem> items;
  final DateTime createdAt;
  final DateTime updatedAt;

  const Purchase({
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

  @override
  List<Object?> get props => [
        id,
        invoiceNumber,
        supplierId,
        supplierName,
        userId,
        userName,
        purchaseDate,
        status,
        subtotal,
        discount,
        tax,
        total,
        notes,
        items,
        createdAt,
        updatedAt,
      ];
}

class PurchaseItem extends Equatable {
  final int id;
  final int purchaseId;
  final int productId;
  final String? productName;
  final String? productCode;
  final String? barcode;
  final double quantity;
  final double purchasePrice;
  final double subtotal;
  final int? unit;

  const PurchaseItem({
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

  @override
  List<Object?> get props => [
        id,
        purchaseId,
        productId,
        productName,
        productCode,
        barcode,
        quantity,
        purchasePrice,
        subtotal,
        unit,
      ];
}

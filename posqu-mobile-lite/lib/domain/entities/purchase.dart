import 'package:equatable/equatable.dart';

class Purchase extends Equatable {
  final String id;
  final String orderNo;
  final String? supplierId;
  final String? supplierName;
  final String status;
  final String? notes;
  final double subtotal;
  final double tax;
  final double total;
  final List<PurchaseItem> items;
  final DateTime createdAt;
  final DateTime updatedAt;

  const Purchase({
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

  @override
  List<Object?> get props => [
        id,
        orderNo,
        supplierId,
        supplierName,
        status,
        notes,
        subtotal,
        tax,
        total,
        items,
        createdAt,
        updatedAt,
      ];
}

class PurchaseItem extends Equatable {
  final String id;
  final String purchaseOrderId;
  final String productId;
  final String name;
  final String sku;
  final double qty;
  final double costPrice;
  final double lineTotal;

  const PurchaseItem({
    required this.id,
    required this.purchaseOrderId,
    required this.productId,
    this.name = '',
    this.sku = '',
    required this.qty,
    required this.costPrice,
    required this.lineTotal,
  });

  @override
  List<Object?> get props => [
        id,
        purchaseOrderId,
        productId,
        name,
        sku,
        qty,
        costPrice,
        lineTotal,
      ];
}

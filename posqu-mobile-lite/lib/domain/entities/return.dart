import 'package:equatable/equatable.dart';

class Return extends Equatable {
  final String id;

  final String? tenantId;
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
  final List<ReturnItem> items;
  final DateTime createdAt;
  final DateTime updatedAt;

  const Return({
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
    this.tenantId,
  });

  Return copyWith({
    String? id,
    String? tenantId,
    String? returnNumber,
  }) {
    return Return(
      id: id ?? this.id,
      tenantId: tenantId ?? this.tenantId,
      returnNumber: returnNumber ?? this.returnNumber,
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
      items: items,
      createdAt: createdAt,
      updatedAt: updatedAt,
    );
  }

  @override
  List<Object?> get props => [
        id,
        tenantId,
        returnNumber,
        saleId,
        saleInvoice,
        purchaseId,
        purchaseInvoice,
        type,
        userId,
        userName,
        customerId,
        customerName,
        supplierId,
        supplierName,
        returnDate,
        reason,
        status,
        total,
        notes,
        items,
        createdAt,
        updatedAt,
      ];
}

class ReturnItem extends Equatable {
  final String id;
  final String returnId;
  final String productId;
  final String? productName;
  final String? productCode;
  final double quantity;
  final double price;
  final double subtotal;
  final String reason;

  const ReturnItem({
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

  @override
  List<Object?> get props => [
        id,
        returnId,
        productId,
        productName,
        productCode,
        quantity,
        price,
        subtotal,
        reason,
      ];
}

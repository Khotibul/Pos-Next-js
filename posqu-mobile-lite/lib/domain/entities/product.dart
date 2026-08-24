import 'package:equatable/equatable.dart';

class Product extends Equatable {
  final String id;
  final String sku;
  final String? slug;
  final String? barcode;
  final String? qrCode;
  final String name;
  final String? description;
  final String? categoryId;
  final String? categoryName;
  final String? brandId;
  final String? supplierId;
  final String? supplierName;
  final String? unitId;
  final double costPrice;
  final double sellingPrice;
  final double marginPct;
  final double taxRate;
  final double weight;
  final double volume;
  final double minStock;
  final double reorderPoint;
  final double wholesalePrice;
  final double wholesaleDiscountPercent;
  final int wholesaleMinQty;
  final bool isActive;
  final bool isFeatured;
  final bool isConsignment;
  final String type;

  final int stock;
  final String unit;
  final String? imageUrl;

  final DateTime createdAt;
  final DateTime updatedAt;

  const Product({
    required this.id,
    required this.sku,
    this.slug,
    this.barcode,
    this.qrCode,
    required this.name,
    this.description,
    this.categoryId,
    this.categoryName,
    this.brandId,
    this.supplierId,
    this.supplierName,
    this.unitId,
    this.costPrice = 0,
    this.sellingPrice = 0,
    this.marginPct = 0,
    this.taxRate = 0,
    this.weight = 0,
    this.volume = 0,
    this.minStock = 0,
    this.reorderPoint = 0,
    this.wholesalePrice = 0,
    this.wholesaleDiscountPercent = 0,
    this.wholesaleMinQty = 0,
    this.isActive = true,
    this.isFeatured = false,
    this.isConsignment = false,
    this.type = 'SINGLE',
    this.stock = 0,
    this.unit = 'pcs',
    this.imageUrl,
    required this.createdAt,
    required this.updatedAt,
  });

  Product copyWith({
    String? id,
    String? sku,
    String? slug,
    String? barcode,
    String? qrCode,
    String? name,
    String? description,
    String? categoryId,
    String? categoryName,
    String? brandId,
    String? supplierId,
    String? supplierName,
    String? unitId,
    double? costPrice,
    double? sellingPrice,
    double? marginPct,
    double? taxRate,
    double? weight,
    double? volume,
    double? minStock,
    double? reorderPoint,
    double? wholesalePrice,
    double? wholesaleDiscountPercent,
    int? wholesaleMinQty,
    bool? isActive,
    bool? isFeatured,
    bool? isConsignment,
    String? type,
    int? stock,
    String? unit,
    String? imageUrl,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return Product(
      id: id ?? this.id,
      sku: sku ?? this.sku,
      slug: slug ?? this.slug,
      barcode: barcode ?? this.barcode,
      qrCode: qrCode ?? this.qrCode,
      name: name ?? this.name,
      description: description ?? this.description,
      categoryId: categoryId ?? this.categoryId,
      categoryName: categoryName ?? this.categoryName,
      brandId: brandId ?? this.brandId,
      supplierId: supplierId ?? this.supplierId,
      supplierName: supplierName ?? this.supplierName,
      unitId: unitId ?? this.unitId,
      costPrice: costPrice ?? this.costPrice,
      sellingPrice: sellingPrice ?? this.sellingPrice,
      marginPct: marginPct ?? this.marginPct,
      taxRate: taxRate ?? this.taxRate,
      weight: weight ?? this.weight,
      volume: volume ?? this.volume,
      minStock: minStock ?? this.minStock,
      reorderPoint: reorderPoint ?? this.reorderPoint,
      wholesalePrice: wholesalePrice ?? this.wholesalePrice,
      wholesaleDiscountPercent:
          wholesaleDiscountPercent ?? this.wholesaleDiscountPercent,
      wholesaleMinQty: wholesaleMinQty ?? this.wholesaleMinQty,
      isActive: isActive ?? this.isActive,
      isFeatured: isFeatured ?? this.isFeatured,
      isConsignment: isConsignment ?? this.isConsignment,
      type: type ?? this.type,
      stock: stock ?? this.stock,
      unit: unit ?? this.unit,
      imageUrl: imageUrl ?? this.imageUrl,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  bool get isLowStock => stock <= minStock;
  bool get isOutOfStock => stock <= 0;

  @override
  List<Object?> get props => [
        id,
        sku,
        slug,
        barcode,
        qrCode,
        name,
        description,
        categoryId,
        categoryName,
        brandId,
        supplierId,
        supplierName,
        unitId,
        costPrice,
        sellingPrice,
        marginPct,
        taxRate,
        weight,
        volume,
        minStock,
        reorderPoint,
        wholesalePrice,
        wholesaleDiscountPercent,
        wholesaleMinQty,
        isActive,
        isFeatured,
        isConsignment,
        type,
        stock,
        unit,
        imageUrl,
        createdAt,
        updatedAt,
      ];
}

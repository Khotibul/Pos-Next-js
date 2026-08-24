import 'package:json_annotation/json_annotation.dart';

import '../../domain/entities/product.dart';

part 'product_model.g.dart';

@JsonSerializable()
class ProductModel {
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

  const ProductModel({
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

  factory ProductModel.fromJson(Map<String, dynamic> json) =>
      _$ProductModelFromJson(json);

  Map<String, dynamic> toJson() => _$ProductModelToJson(this);

  Product toEntity() {
    return Product(
      id: id,
      sku: sku,
      slug: slug,
      barcode: barcode,
      qrCode: qrCode,
      name: name,
      description: description,
      categoryId: categoryId,
      categoryName: categoryName,
      brandId: brandId,
      supplierId: supplierId,
      supplierName: supplierName,
      unitId: unitId,
      costPrice: costPrice,
      sellingPrice: sellingPrice,
      marginPct: marginPct,
      taxRate: taxRate,
      weight: weight,
      volume: volume,
      minStock: minStock,
      reorderPoint: reorderPoint,
      wholesalePrice: wholesalePrice,
      wholesaleDiscountPercent: wholesaleDiscountPercent,
      wholesaleMinQty: wholesaleMinQty,
      isActive: isActive,
      isFeatured: isFeatured,
      isConsignment: isConsignment,
      type: type,
      stock: stock,
      unit: unit,
      imageUrl: imageUrl,
      createdAt: createdAt,
      updatedAt: updatedAt,
    );
  }

  factory ProductModel.fromEntity(Product product) {
    return ProductModel(
      id: product.id,
      sku: product.sku,
      slug: product.slug,
      barcode: product.barcode,
      qrCode: product.qrCode,
      name: product.name,
      description: product.description,
      categoryId: product.categoryId,
      categoryName: product.categoryName,
      brandId: product.brandId,
      supplierId: product.supplierId,
      supplierName: product.supplierName,
      unitId: product.unitId,
      costPrice: product.costPrice,
      sellingPrice: product.sellingPrice,
      marginPct: product.marginPct,
      taxRate: product.taxRate,
      weight: product.weight,
      volume: product.volume,
      minStock: product.minStock,
      reorderPoint: product.reorderPoint,
      wholesalePrice: product.wholesalePrice,
      wholesaleDiscountPercent: product.wholesaleDiscountPercent,
      wholesaleMinQty: product.wholesaleMinQty,
      isActive: product.isActive,
      isFeatured: product.isFeatured,
      isConsignment: product.isConsignment,
      type: product.type,
      stock: product.stock,
      unit: product.unit,
      imageUrl: product.imageUrl,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    );
  }
}

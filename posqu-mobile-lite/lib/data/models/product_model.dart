import 'package:json_annotation/json_annotation.dart';

import '../../domain/entities/product.dart';

part 'product_model.g.dart';

@JsonSerializable()
class ProductModel {
  final int id;
  final String code;
  final String? barcode;
  final String name;
  final String? description;
  @JsonKey(name: 'category_id')
  final int categoryId;
  @JsonKey(name: 'category_name')
  final String? categoryName;
  @JsonKey(name: 'supplier_id')
  final int? supplierId;
  @JsonKey(name: 'supplier_name')
  final String? supplierName;
  @JsonKey(name: 'purchase_price')
  final double purchasePrice;
  @JsonKey(name: 'selling_price')
  final double sellingPrice;
  @JsonKey(name: 'wholesale_price')
  final double? wholesalePrice;
  final int stock;
  @JsonKey(name: 'min_stock')
  final int minStock;
  final String unit;
  @JsonKey(name: 'image_url')
  final String? imageUrl;
  @JsonKey(name: 'is_active')
  final bool isActive;
  @JsonKey(name: 'created_at')
  final DateTime createdAt;
  @JsonKey(name: 'updated_at')
  final DateTime updatedAt;

  const ProductModel({
    required this.id,
    required this.code,
    this.barcode,
    required this.name,
    this.description,
    required this.categoryId,
    this.categoryName,
    this.supplierId,
    this.supplierName,
    required this.purchasePrice,
    required this.sellingPrice,
    this.wholesalePrice,
    required this.stock,
    this.minStock = 0,
    required this.unit,
    this.imageUrl,
    this.isActive = true,
    required this.createdAt,
    required this.updatedAt,
  });

  factory ProductModel.fromJson(Map<String, dynamic> json) =>
      _$ProductModelFromJson(json);

  Map<String, dynamic> toJson() => _$ProductModelToJson(this);

  Product toEntity() {
    return Product(
      id: id,
      code: code,
      barcode: barcode,
      name: name,
      description: description,
      categoryId: categoryId,
      categoryName: categoryName,
      supplierId: supplierId,
      supplierName: supplierName,
      purchasePrice: purchasePrice,
      sellingPrice: sellingPrice,
      wholesalePrice: wholesalePrice,
      stock: stock,
      minStock: minStock,
      unit: unit,
      imageUrl: imageUrl,
      isActive: isActive,
      createdAt: createdAt,
      updatedAt: updatedAt,
    );
  }

  factory ProductModel.fromEntity(Product product) {
    return ProductModel(
      id: product.id,
      code: product.code,
      barcode: product.barcode,
      name: product.name,
      description: product.description,
      categoryId: product.categoryId,
      categoryName: product.categoryName,
      supplierId: product.supplierId,
      supplierName: product.supplierName,
      purchasePrice: product.purchasePrice,
      sellingPrice: product.sellingPrice,
      wholesalePrice: product.wholesalePrice,
      stock: product.stock,
      minStock: product.minStock,
      unit: product.unit,
      imageUrl: product.imageUrl,
      isActive: product.isActive,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    );
  }
}

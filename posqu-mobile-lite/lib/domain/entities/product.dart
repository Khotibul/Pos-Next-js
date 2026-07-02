import 'package:equatable/equatable.dart';

class Product extends Equatable {
  final int id;
  final String code;
  final String? barcode;
  final String name;
  final String? description;
  final int categoryId;
  final String? categoryName;
  final int? supplierId;
  final String? supplierName;
  final double purchasePrice;
  final double sellingPrice;
  final double? wholesalePrice;
  final int stock;
  final int minStock;
  final String unit;
  final String? imageUrl;
  final bool isActive;
  final DateTime createdAt;
  final DateTime updatedAt;

  const Product({
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

  Product copyWith({
    int? id,
    String? code,
    String? barcode,
    String? name,
    String? description,
    int? categoryId,
    String? categoryName,
    int? supplierId,
    String? supplierName,
    double? purchasePrice,
    double? sellingPrice,
    double? wholesalePrice,
    int? stock,
    int? minStock,
    String? unit,
    String? imageUrl,
    bool? isActive,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return Product(
      id: id ?? this.id,
      code: code ?? this.code,
      barcode: barcode ?? this.barcode,
      name: name ?? this.name,
      description: description ?? this.description,
      categoryId: categoryId ?? this.categoryId,
      categoryName: categoryName ?? this.categoryName,
      supplierId: supplierId ?? this.supplierId,
      supplierName: supplierName ?? this.supplierName,
      purchasePrice: purchasePrice ?? this.purchasePrice,
      sellingPrice: sellingPrice ?? this.sellingPrice,
      wholesalePrice: wholesalePrice ?? this.wholesalePrice,
      stock: stock ?? this.stock,
      minStock: minStock ?? this.minStock,
      unit: unit ?? this.unit,
      imageUrl: imageUrl ?? this.imageUrl,
      isActive: isActive ?? this.isActive,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  bool get isLowStock => stock <= minStock;
  bool get isOutOfStock => stock <= 0;

  @override
  List<Object?> get props => [
        id,
        code,
        barcode,
        name,
        description,
        categoryId,
        categoryName,
        supplierId,
        supplierName,
        purchasePrice,
        sellingPrice,
        wholesalePrice,
        stock,
        minStock,
        unit,
        imageUrl,
        isActive,
        createdAt,
        updatedAt,
      ];
}

import 'package:json_annotation/json_annotation.dart';

import '../../domain/entities/product.dart';

part 'product_variant_model.g.dart';

@JsonSerializable()
class ProductVariantModel {
  final String id;
  final String? productId;
  final String sku;
  final String name;
  final String? barcode;
  final String? qrCode;
  final double price;
  final int stock;

  const ProductVariantModel({
    required this.id,
    this.productId,
    this.sku = '',
    this.name = '',
    this.barcode,
    this.qrCode,
    this.price = 0,
    this.stock = 0,
  });

  factory ProductVariantModel.fromJson(Map<String, dynamic> json) {
    final rawPrice = json['price'] ?? json['sellingPrice'] ?? 0;
    final rawStock = json['stock'] ?? 0;
    return ProductVariantModel(
      id: json['id']?.toString() ?? '',
      productId: json['productId']?.toString(),
      sku: json['sku']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      barcode: json['barcode']?.toString(),
      qrCode: json['qrCode']?.toString(),
      price: (rawPrice as num?)?.toDouble() ?? 0,
      stock: (rawStock as num?)?.toInt() ?? 0,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'productId': productId,
        'sku': sku,
        'name': name,
        'barcode': barcode,
        'qrCode': qrCode,
        'price': price,
        'stock': stock,
      };

  ProductVariant toEntity({String? parentProductId}) => ProductVariant(
        id: id,
        productId: productId ?? parentProductId ?? '',
        sku: sku,
        name: name,
        barcode: barcode,
        qrCode: qrCode,
        price: price,
        stock: stock,
      );

  factory ProductVariantModel.fromEntity(
    ProductVariant variant, {
    String? productId,
  }) =>
      ProductVariantModel(
        id: variant.id,
        productId: productId ?? variant.productId,
        sku: variant.sku,
        name: variant.name,
        barcode: variant.barcode,
        qrCode: variant.qrCode,
        price: variant.price,
        stock: variant.stock,
      );

  static ProductVariantModel? tryFromDynamic(dynamic value) {
    if (value is Map) {
      return ProductVariantModel.fromJson(Map<String, dynamic>.from(value));
    }
    return null;
  }
}

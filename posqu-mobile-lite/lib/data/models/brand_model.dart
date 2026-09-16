import '../../domain/entities/brand.dart';

class BrandModel {
  final String id;
  final String name;
  final DateTime createdAt;
  final DateTime updatedAt;

  const BrandModel({
    required this.id,
    required this.name,
    required this.createdAt,
    required this.updatedAt,
  });

  factory BrandModel.fromJson(Map<String, dynamic> json) {
    return BrandModel(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      createdAt: DateTime.tryParse(json['createdAt'] as String? ?? '') ?? DateTime.now(),
      updatedAt: DateTime.tryParse(json['updatedAt'] as String? ?? '') ?? DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'createdAt': createdAt.toIso8601String(),
        'updatedAt': updatedAt.toIso8601String(),
      };

  Brand toEntity() => Brand(
        id: id,
        name: name,
        createdAt: createdAt,
        updatedAt: updatedAt,
      );

  factory BrandModel.fromEntity(Brand brand) => BrandModel(
        id: brand.id,
        name: brand.name,
        createdAt: brand.createdAt,
        updatedAt: brand.updatedAt,
      );
}

import '../../domain/entities/unit.dart';

class UnitModel {
  final String id;
  final String name;
  final DateTime createdAt;
  final DateTime updatedAt;

  const UnitModel({
    required this.id,
    required this.name,
    required this.createdAt,
    required this.updatedAt,
  });

  factory UnitModel.fromJson(Map<String, dynamic> json) {
    return UnitModel(
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

  Unit toEntity() => Unit(
        id: id,
        name: name,
        createdAt: createdAt,
        updatedAt: updatedAt,
      );

  factory UnitModel.fromEntity(Unit unit) => UnitModel(
        id: unit.id,
        name: unit.name,
        createdAt: unit.createdAt,
        updatedAt: unit.updatedAt,
      );
}

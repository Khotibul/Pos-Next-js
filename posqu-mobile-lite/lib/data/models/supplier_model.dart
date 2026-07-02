import 'package:json_annotation/json_annotation.dart';

import '../../domain/entities/supplier.dart';

part 'supplier_model.g.dart';

@JsonSerializable()
class SupplierModel {
  final int id;
  final String name;
  final String? phone;
  final String? email;
  final String? address;
  final String? city;
  @JsonKey(name: 'contact_person')
  final String? contactPerson;
  final String? npwp;
  @JsonKey(name: 'is_active')
  final bool isActive;
  @JsonKey(name: 'created_at')
  final DateTime createdAt;
  @JsonKey(name: 'updated_at')
  final DateTime updatedAt;

  const SupplierModel({
    required this.id,
    required this.name,
    this.phone,
    this.email,
    this.address,
    this.city,
    this.contactPerson,
    this.npwp,
    this.isActive = true,
    required this.createdAt,
    required this.updatedAt,
  });

  factory SupplierModel.fromJson(Map<String, dynamic> json) =>
      _$SupplierModelFromJson(json);

  Map<String, dynamic> toJson() => _$SupplierModelToJson(this);

  Supplier toEntity() {
    return Supplier(
      id: id,
      name: name,
      phone: phone,
      email: email,
      address: address,
      city: city,
      contactPerson: contactPerson,
      npwp: npwp,
      isActive: isActive,
      createdAt: createdAt,
      updatedAt: updatedAt,
    );
  }

  factory SupplierModel.fromEntity(Supplier supplier) {
    return SupplierModel(
      id: supplier.id,
      name: supplier.name,
      phone: supplier.phone,
      email: supplier.email,
      address: supplier.address,
      city: supplier.city,
      contactPerson: supplier.contactPerson,
      npwp: supplier.npwp,
      isActive: supplier.isActive,
      createdAt: supplier.createdAt,
      updatedAt: supplier.updatedAt,
    );
  }
}

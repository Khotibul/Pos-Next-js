import 'package:json_annotation/json_annotation.dart';

import '../../domain/entities/customer.dart';

part 'customer_model.g.dart';

@JsonSerializable()
class CustomerModel {
  final int id;
  final String name;
  final String? phone;
  final String? email;
  final String? address;
  final String? city;
  @JsonKey(name: 'total_purchase')
  final double totalPurchase;
  @JsonKey(name: 'purchase_count')
  final int purchaseCount;
  final double points;
  @JsonKey(name: 'is_active')
  final bool isActive;
  @JsonKey(name: 'created_at')
  final DateTime createdAt;
  @JsonKey(name: 'updated_at')
  final DateTime updatedAt;

  const CustomerModel({
    required this.id,
    required this.name,
    this.phone,
    this.email,
    this.address,
    this.city,
    this.totalPurchase = 0,
    this.purchaseCount = 0,
    this.points = 0,
    this.isActive = true,
    required this.createdAt,
    required this.updatedAt,
  });

  factory CustomerModel.fromJson(Map<String, dynamic> json) =>
      _$CustomerModelFromJson(json);

  Map<String, dynamic> toJson() => _$CustomerModelToJson(this);

  Customer toEntity() {
    return Customer(
      id: id,
      name: name,
      phone: phone,
      email: email,
      address: address,
      city: city,
      totalPurchase: totalPurchase,
      purchaseCount: purchaseCount,
      points: points,
      isActive: isActive,
      createdAt: createdAt,
      updatedAt: updatedAt,
    );
  }

  factory CustomerModel.fromEntity(Customer customer) {
    return CustomerModel(
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      address: customer.address,
      city: customer.city,
      totalPurchase: customer.totalPurchase,
      purchaseCount: customer.purchaseCount,
      points: customer.points,
      isActive: customer.isActive,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
    );
  }
}

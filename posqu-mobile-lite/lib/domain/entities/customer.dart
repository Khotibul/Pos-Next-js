import 'package:equatable/equatable.dart';

class Customer extends Equatable {
  final String id;
  final String name;
  final String? phone;
  final String? email;
  final String? address;
  final String? city;
  final double totalPurchase;
  final int purchaseCount;
  final double points;
  final bool isActive;
  final DateTime createdAt;
  final DateTime updatedAt;

  const Customer({
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

  Customer copyWith({
    String? id,
    String? name,
    String? phone,
    String? email,
    String? address,
    String? city,
    double? totalPurchase,
    int? purchaseCount,
    double? points,
    bool? isActive,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return Customer(
      id: id ?? this.id,
      name: name ?? this.name,
      phone: phone ?? this.phone,
      email: email ?? this.email,
      address: address ?? this.address,
      city: city ?? this.city,
      totalPurchase: totalPurchase ?? this.totalPurchase,
      purchaseCount: purchaseCount ?? this.purchaseCount,
      points: points ?? this.points,
      isActive: isActive ?? this.isActive,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  @override
  List<Object?> get props => [
        id,
        name,
        phone,
        email,
        address,
        city,
        totalPurchase,
        purchaseCount,
        points,
        isActive,
        createdAt,
        updatedAt,
      ];
}

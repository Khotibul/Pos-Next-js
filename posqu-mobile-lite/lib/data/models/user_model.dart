import 'package:json_annotation/json_annotation.dart';

import '../../domain/entities/user.dart';

part 'user_model.g.dart';

DateTime _safeDateTime(Object? value) {
  if (value is String) {
    return DateTime.tryParse(value) ?? DateTime.now();
  }
  if (value is int) {
    return DateTime.fromMillisecondsSinceEpoch(value);
  }
  return DateTime.now();
}

@JsonSerializable()
class UserModel {
  final String id;
  final String? name;
  final String? email;
  @JsonKey(name: 'image')
  final String? avatarUrl;
  final String? role;
  final bool? isActive;
  @JsonKey(fromJson: _safeDateTime)
  final DateTime createdAt;
  @JsonKey(fromJson: _safeDateTime)
  final DateTime updatedAt;

  const UserModel({
    required this.id,
    this.name,
    this.email,
    this.avatarUrl,
    this.role = 'USER',
    this.isActive = true,
    required this.createdAt,
    required this.updatedAt,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) =>
      _$UserModelFromJson(json);

  Map<String, dynamic> toJson() => _$UserModelToJson(this);

  User toEntity() {
    final resolvedEmail = email ?? '';
    final resolvedName = (name != null && name!.trim().isNotEmpty)
        ? name!.trim()
        : (resolvedEmail.isNotEmpty
            ? resolvedEmail.split('@').first
            : 'Pengguna');
    return User(
      id: id,
      name: resolvedName,
      email: resolvedEmail,
      avatarUrl: avatarUrl,
      role: (role != null && role!.isNotEmpty) ? role! : 'USER',
      isActive: isActive ?? true,
      createdAt: createdAt,
      updatedAt: updatedAt,
    );
  }

  factory UserModel.fromEntity(User user) {
    return UserModel(
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    );
  }
}

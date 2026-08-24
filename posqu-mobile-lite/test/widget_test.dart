import 'dart:convert';

import 'package:crypto/crypto.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:posqu_mobile_lite/data/models/user_model.dart';

void main() {
  group('UserModel.fromJson', () {
    test('toleran terhadap respons /api/mobile/auth/login tanpa timestamps', () {
      final json = <String, dynamic>{
        'id': 'usr_123',
        'email': 'admin@demo-resto.local',
        'name': 'Admin Demo',
        'image': null,
      };

      final user = UserModel.fromJson(json).toEntity();

      expect(user.id, 'usr_123');
      expect(user.email, 'admin@demo-resto.local');
      expect(user.name, 'Admin Demo');
      expect(user.role, 'USER');
      expect(user.isActive, isTrue);
    });

    test('fallback nama dari email bila name kosong', () {
      final json = <String, dynamic>{'id': 'u1', 'email': 'kasir@demo.local'};

      final user = UserModel.fromJson(json).toEntity();

      expect(user.name, 'kasir');
    });

    test('membaca kembali cache yang berisi field lengkap', () {
      final original = UserModel(
        id: 'local-1',
        name: 'Administrator',
        email: 'admin@posqu.local',
        role: 'ADMIN',
        createdAt: DateTime(2026),
        updatedAt: DateTime(2026),
      );

      final decoded = UserModel.fromJson(original.toJson()).toEntity();

      expect(decoded.id, 'local-1');
      expect(decoded.name, 'Administrator');
      expect(decoded.email, 'admin@posqu.local');
      expect(decoded.role, 'ADMIN');
    });
  });

  group('Local admin password hash', () {
    test('sha256(admin123) sama dengan seed passwordHash', () {
      final hashed = sha256.convert(utf8.encode('admin123')).toString();
      expect(
        hashed,
        '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',
      );
    });
  });
}

import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';

final hiveCacheProvider = Provider<HiveCache>((ref) {
  return HiveCache();
});

class HiveCache {
  static const String _authBox = 'auth';
  static const String _settingsBox = 'settings';
  static const String _cacheBox = 'cache';

  Future<void> init() async {
    await Hive.openBox(_authBox);
    await Hive.openBox(_settingsBox);
    await Hive.openBox(_cacheBox);
  }

  // Auth
  Future<void> saveToken(String token) async {
    final box = Hive.box(_authBox);
    await box.put('token', token);
  }

  String? getToken() {
    final box = Hive.box(_authBox);
    return box.get('token');
  }

  Future<void> saveRefreshToken(String token) async {
    final box = Hive.box(_authBox);
    await box.put('refreshToken', token);
  }

  String? getRefreshToken() {
    final box = Hive.box(_authBox);
    return box.get('refreshToken');
  }

  Future<void> saveUserData(Map<String, dynamic> user) async {
    final box = Hive.box(_authBox);
    await box.put('user', user);
  }

  Map<String, dynamic>? getUserData() {
    final box = Hive.box(_authBox);
    return box.get('user');
  }

  /// Waktu aktivitas terakhir (epoch ms) — dasar sesi sliding 1 jam.
  Future<void> saveLastActiveAt(DateTime time) async {
    final box = Hive.box(_authBox);
    await box.put('lastActiveAt', time.millisecondsSinceEpoch);
  }

  DateTime? getLastActiveAt() {
    final box = Hive.box(_authBox);
    final value = box.get('lastActiveAt');
    if (value is int) return DateTime.fromMillisecondsSinceEpoch(value);
    return null;
  }

  Future<void> clearAuth() async {
    final box = Hive.box(_authBox);
    await box.clear();
  }

  // "Ingat password" — sengaja disimpan di box settings supaya tidak ikut
  // terhapus saat logout / sesi kedaluwarsa. Obfuscated base64 (bukan enkripsi
  // kuat) agar tidak tersimpan sebagai plaintext di preferensi.
  static const String _rememberEmailKey = 'remember_email';
  static const String _rememberPasswordKey = 'remember_password';
  static const String _rememberEnabledKey = 'remember_password_enabled';

  Future<void> saveRememberedCredentials(String email, String password) async {
    final box = Hive.box(_settingsBox);
    await box.put(_rememberEmailKey, email.trim().toLowerCase());
    await box.put(_rememberPasswordKey, base64Encode(utf8.encode(password)));
    await box.put(_rememberEnabledKey, true);
  }

  Future<void> clearRememberedCredentials() async {
    final box = Hive.box(_settingsBox);
    await box.put(_rememberEnabledKey, false);
    await box.delete(_rememberEmailKey);
    await box.delete(_rememberPasswordKey);
  }

  bool get rememberPasswordEnabled =>
      Hive.box(_settingsBox).get(_rememberEnabledKey) == true;

  String? getRememberedEmail() {
    final box = Hive.box(_settingsBox);
    final value = box.get(_rememberEmailKey);
    return value is String && value.isNotEmpty ? value : null;
  }

  String? getRememberedPassword() {
    final box = Hive.box(_settingsBox);
    final value = box.get(_rememberPasswordKey);
    if (value is! String || value.isEmpty) return null;
    try {
      return utf8.decode(base64Decode(value));
    } catch (_) {
      return null;
    }
  }

  // Settings
  Future<void> setSetting(String key, String value) async {
    final box = Hive.box(_settingsBox);
    await box.put(key, value);
  }

  String? getSetting(String key) {
    final box = Hive.box(_settingsBox);
    return box.get(key);
  }

  Future<void> setSettingJson(String key, Map<String, dynamic> value) async {
    final box = Hive.box(_settingsBox);
    await box.put(key, value);
  }

  Map<String, dynamic>? getSettingJson(String key) {
    final box = Hive.box(_settingsBox);
    return box.get(key);
  }

  // Cache
  Future<void> setCache(String key, dynamic value) async {
    final box = Hive.box(_cacheBox);
    await box.put(key, value);
  }

  dynamic getCache(String key) {
    final box = Hive.box(_cacheBox);
    return box.get(key);
  }

  Future<void> clearCache() async {
    final box = Hive.box(_cacheBox);
    await box.clear();
  }

  Future<void> clearAll() async {
    await Hive.box(_authBox).clear();
    await Hive.box(_settingsBox).clear();
    await Hive.box(_cacheBox).clear();
  }
}

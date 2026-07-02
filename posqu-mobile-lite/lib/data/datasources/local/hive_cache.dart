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

  Future<void> clearAuth() async {
    final box = Hive.box(_authBox);
    await box.clear();
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

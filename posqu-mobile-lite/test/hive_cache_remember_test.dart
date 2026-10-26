import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:hive/hive.dart';

import 'package:posqu_mobile_lite/data/datasources/local/hive_cache.dart';

void main() {
  late Directory tempDir;
  late HiveCache cache;

  setUpAll(() async {
    tempDir = await Directory.systemTemp.createTemp('posqu_hive_test');
    Hive.init(tempDir.path);
  });

  setUp(() async {
    cache = HiveCache();
    await cache.init();
    await cache.clearAll();
  });

  tearDownAll(() async {
    await Hive.close();
    await tempDir.delete(recursive: true);
  });

  group('Ingat password', () {
    test('menyimpan dan membaca kembali kredensial', () async {
      await cache.saveRememberedCredentials('Owner@Demo.Local ', 'Password123!');

      expect(cache.rememberPasswordEnabled, isTrue);
      expect(cache.getRememberedEmail(), 'owner@demo.local');
      expect(cache.getRememberedPassword(), 'Password123!');
    });

    test('password tidak disimpan sebagai plaintext', () async {
      await cache.saveRememberedCredentials('owner@demo.local', 'Password123!');

      final raw = Hive.box('settings').get('remember_password');
      expect(raw, isA<String>());
      expect(raw, isNot(contains('Password123!')));
    });

    test('clearAuth (logout) tidak menghapus kredensial tersimpan', () async {
      await cache.saveToken('token-abc');
      await cache.saveRememberedCredentials('owner@demo.local', 'Password123!');

      await cache.clearAuth();

      expect(cache.getToken(), isNull);
      expect(cache.rememberPasswordEnabled, isTrue);
      expect(cache.getRememberedEmail(), 'owner@demo.local');
      expect(cache.getRememberedPassword(), 'Password123!');
    });

    test('clearRememberedCredentials menghapus email dan password', () async {
      await cache.saveRememberedCredentials('owner@demo.local', 'Password123!');

      await cache.clearRememberedCredentials();

      expect(cache.rememberPasswordEnabled, isFalse);
      expect(cache.getRememberedEmail(), isNull);
      expect(cache.getRememberedPassword(), isNull);
    });
  });
}

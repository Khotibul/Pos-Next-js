import 'package:dartz/dartz.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/errors/failures.dart';
import '../../domain/repositories/setting_repository.dart';
import '../datasources/local/hive_cache.dart';

final settingRepositoryProvider = Provider<SettingRepository>((ref) {
  return SettingRepositoryImpl(cache: ref.read(hiveCacheProvider));
});

class SettingRepositoryImpl implements SettingRepository {
  final HiveCache cache;

  SettingRepositoryImpl({required this.cache});

  @override
  Future<Either<Failure, String?>> getSetting(String key) async {
    try {
      return Right(cache.getSetting(key));
    } catch (e) {
      return const Right(null);
    }
  }

  @override
  Future<Either<Failure, void>> setSetting(String key, String value) async {
    try {
      await cache.setSetting(key, value);
      return const Right(null);
    } catch (e) {
      return const Left(CacheFailure(message: 'Gagal menyimpan pengaturan'));
    }
  }

  @override
  Future<Either<Failure, Map<String, String>>> getAllSettings() async {
    try {
      return const Right({});
    } catch (e) {
      return const Left(CacheFailure(message: 'Gagal mengambil pengaturan'));
    }
  }

  @override
  Future<Either<Failure, void>> updateApiBaseUrl(String url) async {
    try {
      await cache.setSetting('API_BASE_URL', url.trim());
      return const Right(null);
    } catch (e) {
      return const Left(CacheFailure(message: 'Gagal mengupdate URL API'));
    }
  }

  @override
  Future<Either<Failure, String?>> getApiBaseUrl() async {
    try {
      return Right(cache.getSetting('API_BASE_URL'));
    } catch (e) {
      return const Right(null);
    }
  }

  @override
  Future<Either<Failure, void>> setPrinterConfig(Map<String, dynamic> config) async {
    try {
      await cache.setSettingJson('printer_config', config);
      return const Right(null);
    } catch (e) {
      return const Left(CacheFailure(message: 'Gagal menyimpan konfigurasi printer'));
    }
  }

  @override
  Future<Either<Failure, Map<String, dynamic>?>> getPrinterConfig() async {
    try {
      return Right(cache.getSettingJson('printer_config'));
    } catch (e) {
      return const Right(null);
    }
  }

  @override
  Future<Either<Failure, void>> setThemeMode(String mode) async {
    try {
      await cache.setSetting('theme_mode', mode);
      return const Right(null);
    } catch (e) {
      return const Left(CacheFailure(message: 'Gagal menyimpan tema'));
    }
  }

  @override
  Future<Either<Failure, String>> getThemeMode() async {
    try {
      return Right(cache.getSetting('theme_mode') ?? 'light');
    } catch (e) {
      return const Right('light');
    }
  }
}

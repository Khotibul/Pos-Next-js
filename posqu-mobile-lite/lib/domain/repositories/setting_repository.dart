import 'package:dartz/dartz.dart' show Either;

import '../../core/errors/failures.dart';

abstract class SettingRepository {
  Future<Either<Failure, String?>> getSetting(String key);
  Future<Either<Failure, void>> setSetting(String key, String value);
  Future<Either<Failure, Map<String, String>>> getAllSettings();
  Future<Either<Failure, void>> updateApiBaseUrl(String url);
  Future<Either<Failure, String?>> getApiBaseUrl();
  Future<Either<Failure, void>> setPrinterConfig(Map<String, dynamic> config);
  Future<Either<Failure, Map<String, dynamic>?>> getPrinterConfig();
  Future<Either<Failure, void>> setThemeMode(String mode);
  Future<Either<Failure, String>> getThemeMode();
}

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';

import '../../../core/constants/env_config.dart';
import '../../../data/repositories/setting_repository_impl.dart';
import '../../../domain/repositories/setting_repository.dart';

final apiBaseUrlProvider = FutureProvider<String?>((ref) async {
  final repository = ref.read(settingRepositoryProvider);
  final result = await repository.getApiBaseUrl();
  return result.fold((failure) => null, (url) => url);
});

/// URL efektif yang dipakai Dio & sinkronisasi:
/// - Jika user set manual di Pengaturan → pakai manual
/// - Jika kosong / belum diatur → otomatis dari sistem (EnvConfig / .env / posqupro.co-id.id)
final effectiveApiBaseUrlProvider = Provider<String>((ref) {
  // Watch manual agar rebuild saat user simpan di Pengaturan
  final manualAsync = ref.watch(apiBaseUrlProvider);
  final manual = manualAsync.valueOrNull;
  if (manual != null && manual.trim().isNotEmpty) return manual.trim();
  // Fallback Hive sync (jika Future belum selesai tapi box sudah ada)
  try {
    if (Hive.isBoxOpen('settings')) {
      final boxManual = Hive.box('settings').get('API_BASE_URL') as String?;
      if (boxManual != null && boxManual.trim().isNotEmpty) return boxManual.trim();
    }
  } catch (_) {}
  return EnvConfig.apiBaseUrl;
});

/// Mode penentuan URL: otomatis (sistem) atau manual (user)
final apiBaseUrlModeProvider = Provider<String>((ref) {
  final manualAsync = ref.watch(apiBaseUrlProvider);
  final manual = manualAsync.valueOrNull;
  if (manual != null && manual.trim().isNotEmpty) return 'manual';
  try {
    if (Hive.isBoxOpen('settings')) {
      final m = Hive.box('settings').get('API_BASE_URL') as String?;
      if (m != null && m.trim().isNotEmpty) return 'manual';
    }
  } catch (_) {}
  return 'otomatis';
});

final themeModeProvider = StateNotifierProvider<ThemeModeNotifier, String>((ref) {
  return ThemeModeNotifier(ref.read(settingRepositoryProvider));
});

class ThemeModeNotifier extends StateNotifier<String> {
  final SettingRepository _repository;

  ThemeModeNotifier(this._repository) : super('light') {
    _loadTheme();
  }

  Future<void> _loadTheme() async {
    final result = await _repository.getThemeMode();
    result.fold(
      (failure) => null,
      (mode) {
        if (mode.isNotEmpty) state = mode;
      },
    );
  }

  Future<void> setThemeMode(String mode) async {
    state = mode;
    await _repository.setThemeMode(mode);
  }
}

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';

import '../../../core/constants/env_config.dart';
import '../../../data/repositories/setting_repository_impl.dart';
import '../../../domain/repositories/setting_repository.dart';

/// URL manual yang tidak boleh dipakai di device production:
/// - localhost / 127.0.0.1 / 10.0.2.2 → hanya valid di emulator/dev
/// - posqupro (domain cPanel lama) → sudah tidak dipakai, server sering 503/timeout
/// Jika URL manual tidak valid, app otomatis pakai URL produksi dari EnvConfig.
bool isUsableManualApiUrl(String url) {
  final u = url.trim().toLowerCase();
  if (u.isEmpty) return false;
  if (u.contains('localhost') || u.contains('127.0.0.1') || u.contains('10.0.2.2')) {
    return kDebugMode;
  }
  if (u.contains('posqupro')) return false;
  return u.startsWith('http://') || u.startsWith('https://');
}

final apiBaseUrlProvider = FutureProvider<String?>((ref) async {
  final repository = ref.read(settingRepositoryProvider);
  final result = await repository.getApiBaseUrl();
  return result.fold(
    (failure) => null,
    (url) => (url != null && isUsableManualApiUrl(url)) ? url.trim() : null,
  );
});

/// URL efektif yang dipakai Dio & sinkronisasi:
/// - Jika user set manual di Pengaturan → pakai manual (kecuali URL tidak valid)
/// - Jika kosong / tidak valid → otomatis dari sistem (EnvConfig / .env / pos-next-js-kohl.vercel.app)
final effectiveApiBaseUrlProvider = Provider<String>((ref) {
  // Watch manual agar rebuild saat user simpan di Pengaturan
  final manualAsync = ref.watch(apiBaseUrlProvider);
  final manual = manualAsync.valueOrNull;
  if (manual != null && isUsableManualApiUrl(manual)) return manual.trim();
  // Fallback Hive sync (jika Future belum selesai tapi box sudah ada)
  try {
    if (Hive.isBoxOpen('settings')) {
      final boxManual = Hive.box('settings').get('API_BASE_URL') as String?;
      if (boxManual != null && isUsableManualApiUrl(boxManual)) return boxManual.trim();
    }
  } catch (_) {}
  return EnvConfig.apiBaseUrl;
});

/// Mode penentuan URL: otomatis (sistem) atau manual (user)
final apiBaseUrlModeProvider = Provider<String>((ref) {
  final manualAsync = ref.watch(apiBaseUrlProvider);
  final manual = manualAsync.valueOrNull;
  if (manual != null && isUsableManualApiUrl(manual)) return 'manual';
  try {
    if (Hive.isBoxOpen('settings')) {
      final m = Hive.box('settings').get('API_BASE_URL') as String?;
      if (m != null && isUsableManualApiUrl(m)) return 'manual';
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

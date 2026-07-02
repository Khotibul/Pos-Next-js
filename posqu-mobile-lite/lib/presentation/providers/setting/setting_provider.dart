import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../data/repositories/setting_repository_impl.dart';
import '../../../domain/repositories/setting_repository.dart';

final apiBaseUrlProvider = FutureProvider<String?>((ref) async {
  final repository = ref.read(settingRepositoryProvider);
  final result = await repository.getApiBaseUrl();
  return result.fold((failure) => null, (url) => url);
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

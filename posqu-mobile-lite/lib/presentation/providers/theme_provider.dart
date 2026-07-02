import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/app_theme.dart';
import 'setting/setting_provider.dart';

final themeDataProvider = Provider<ThemeData>((ref) {
  final themeMode = ref.watch(themeModeProvider);
  switch (themeMode) {
    case 'dark':
      return AppTheme.darkTheme;
    case 'light':
    default:
      return AppTheme.lightTheme;
  }
});

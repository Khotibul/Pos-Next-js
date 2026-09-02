import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:intl/intl.dart';

import 'core/constants/app_constants.dart';
import 'core/theme/app_theme.dart';
import 'data/datasources/local/hive_cache.dart';
import 'presentation/providers/setting/setting_provider.dart';
import 'presentation/routers/app_router.dart';

Future<void> main() async {
  await runZonedGuarded<Future<void>>(
    () async {
      WidgetsFlutterBinding.ensureInitialized();

      FlutterError.onError = (details) {
        FlutterError.presentError(details);
      };

      await dotenv.load(fileName: '.env');

      await initializeDateFormatting('id', null);
      await initializeDateFormatting('en', null);
      Intl.defaultLocale = 'id';

      await Hive.initFlutter();
      await HiveCache().init();

      SystemChrome.setPreferredOrientations([
        DeviceOrientation.portraitUp,
        DeviceOrientation.landscapeLeft,
        DeviceOrientation.landscapeRight,
      ]);

      SystemChrome.setSystemUIOverlayStyle(
        const SystemUiOverlayStyle(
          statusBarColor: Colors.transparent,
          statusBarIconBrightness: Brightness.dark,
        ),
      );

      runApp(
        const ProviderScope(
          child: POSQUApp(),
        ),
      );
    },
    (error, stack) {
      if (kDebugMode) {
        debugPrint('Uncaught app error: $error');
      }
    },
  );
}

class POSQUApp extends ConsumerWidget {
  const POSQUApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);
    final themeModeStr = ref.watch(themeModeProvider);
    final themeMode = themeModeStr == 'dark' ? ThemeMode.dark : ThemeMode.light;

    return MaterialApp.router(
      title: AppConstants.appName,
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: themeMode,
      routerConfig: router,
    );
  }
}

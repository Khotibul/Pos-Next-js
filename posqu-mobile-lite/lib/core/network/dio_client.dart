import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';

import '../constants/api_constants.dart';
import 'mobile_api_gate.dart';
import '../../presentation/providers/setting/setting_provider.dart';

final dioClientProvider = Provider<DioClient>((ref) {
  final client = DioClient();
  // Sinkron URL efektif (otomatis dari EnvConfig atau manual dari Pengaturan) ke Dio
  // Otomatis: EnvConfig.apiBaseUrl (https://posqupro.co-id.id/api)
  // Manual: Hive settings API_BASE_URL
  void syncEffective() {
    try {
      final effective = ref.read(effectiveApiBaseUrlProvider);
      if (effective.isNotEmpty) client.updateBaseUrl(effective);
    } catch (_) {}
  }

  syncEffective();
  ref.listen<String>(effectiveApiBaseUrlProvider, (prev, next) {
    if (prev != next && next.isNotEmpty) {
      client.updateBaseUrl(next);
      MobileApiGate.reset();
      if (kDebugMode) debugPrint('[Dio] baseUrl efektif: $next (prev: $prev) → reset gate');
    }
  });

  return client;
});

class DioClient {
  late final Dio _dio;
  String? _cachedToken;

  DioClient() {
    _dio = _createDio();
    _preloadToken();
  }

  void _preloadToken() {
    try {
      if (Hive.isBoxOpen('auth')) {
        _cachedToken = Hive.box('auth').get('token') as String?;
      }
    } catch (_) {}
  }

  Dio get dio => _dio;

  Dio _createDio() {
    final dio = Dio(BaseOptions(
      baseUrl: ApiConstants.defaultBaseUrl,
      connectTimeout: ApiConstants.connectTimeout,
      receiveTimeout: ApiConstants.timeout,
      sendTimeout: const Duration(seconds: 10),
      headers: {
        ApiConstants.contentType: ApiConstants.applicationJson,
      },
    ));

    dio.interceptors.addAll([
      _authInterceptor(),
      if (kDebugMode) _loggingInterceptor(),
    ]);

    return dio;
  }

  InterceptorsWrapper _authInterceptor() {
    return InterceptorsWrapper(
      onRequest: (options, handler) async {
        try {
          // Pakai cache memori untuk hindari await Hive per-request (30-120ms → <1ms)
          String? token = _cachedToken;
          if (token == null) {
            final box = Hive.isBoxOpen('auth') ? Hive.box('auth') : await Hive.openBox('auth');
            token = box.get('token') as String?;
            _cachedToken = token;
          }
          if (token != null &&
              options.path != ApiConstants.mobileLogin &&
              options.path != ApiConstants.login &&
              options.path != ApiConstants.mobileGoogleLogin) {
            options.headers[ApiConstants.authorization] = '${ApiConstants.bearer}$token';
          }
        } catch (_) {}
        handler.next(options);
      },
      onError: (error, handler) async {
        final token = error.requestOptions.headers[ApiConstants.authorization] as String? ?? '';
        final isLocalSession = token.startsWith('${ApiConstants.bearer}local.');
        if (error.response?.statusCode == 401 && !isLocalSession) {
          _cachedToken = null;
          try {
            final box = Hive.isBoxOpen('auth') ? Hive.box('auth') : await Hive.openBox('auth');
            await box.delete('token');
          } catch (_) {}
        }
        handler.next(error);
      },
    );
  }

  LogInterceptor _loggingInterceptor() {
    return LogInterceptor(
      requestHeader: false,
      request: true,
      requestBody: false,
      responseHeader: false,
      responseBody: false,
      error: true,
      logPrint: (obj) {
        final text = obj.toString();
        if (text.length > 300) {
          debugPrint('${text.substring(0, 300)}…');
        } else {
          debugPrint(text);
        }
      },
    );
  }

  void updateBaseUrl(String newUrl) {
    _dio.options.baseUrl = newUrl;
  }
}

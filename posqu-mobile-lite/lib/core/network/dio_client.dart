import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';

import '../constants/api_constants.dart';

final dioClientProvider = Provider<DioClient>((ref) {
  return DioClient();
});

class DioClient {
  late final Dio _dio;

  DioClient() {
    _dio = _createDio();
  }

  Dio get dio => _dio;

  Dio _createDio() {
    final dio = Dio(BaseOptions(
      baseUrl: ApiConstants.defaultBaseUrl,
      connectTimeout: ApiConstants.connectTimeout,
      receiveTimeout: ApiConstants.timeout,
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
          final box = await Hive.openBox('auth');
          final token = box.get('token');
          if (token != null &&
              options.path != ApiConstants.mobileLogin &&
              options.path != ApiConstants.login) {
            options.headers[ApiConstants.authorization] =
                '${ApiConstants.bearer}$token';
          }
        } catch (_) {}
        handler.next(options);
      },
      onError: (error, handler) async {
        final token = error.requestOptions.headers[ApiConstants.authorization]
                as String? ??
            '';
        final isLocalSession = token.startsWith('${ApiConstants.bearer}local.');
        if (error.response?.statusCode == 401 && !isLocalSession) {
          try {
            final box = await Hive.openBox('auth');
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

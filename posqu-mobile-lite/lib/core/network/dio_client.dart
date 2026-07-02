import 'package:dio/dio.dart';
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
      _loggingInterceptor(),
      _errorInterceptor(),
    ]);

    return dio;
  }

  InterceptorsWrapper _authInterceptor() {
    return InterceptorsWrapper(
      onRequest: (options, handler) async {
        try {
          final box = await Hive.openBox('auth');
          final token = box.get('token');
          if (token != null) {
            options.headers[ApiConstants.authorization] =
                '${ApiConstants.bearer}$token';
          }
        } catch (_) {}
        handler.next(options);
      },
      onError: (error, handler) async {
        if (error.response?.statusCode == 401) {
          try {
            final box = await Hive.openBox('auth');
            final refreshToken = box.get('refreshToken');
            if (refreshToken != null) {
              final response = await _dio.post(ApiConstants.refreshToken, data: {
                'refreshToken': refreshToken,
              });
              final newToken = response.data['token'];
              await box.put('token', newToken);
              error.requestOptions.headers[ApiConstants.authorization] =
                  '${ApiConstants.bearer}$newToken';
              final retryResponse = await _dio.fetch(error.requestOptions);
              handler.resolve(retryResponse);
              return;
            }
          } catch (_) {
            // If refresh token fails, clear auth data and proceed with error
            try {
              final box = await Hive.openBox('auth');
              await box.clear();
            } catch (_) {}
          }
        }
        handler.next(error);
      },
    );
  }

  LogInterceptor _loggingInterceptor() {
    return LogInterceptor(
      requestBody: true,
      responseBody: true,
      error: true,
    );
  }

  InterceptorsWrapper _errorInterceptor() {
    return InterceptorsWrapper(
      onError: (error, handler) {
        handler.next(error);
      },
    );
  }

  void updateBaseUrl(String newUrl) {
    _dio.options.baseUrl = newUrl;
  }
}

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/constants/api_constants.dart';
import '../../../core/errors/exceptions.dart';
import '../../../core/network/dio_client.dart';
import '../../models/user_model.dart';

class LoginResponse {
  final UserModel user;
  final String token;

  const LoginResponse({required this.user, required this.token});
}

final authRemoteDataSourceProvider = Provider<AuthRemoteDataSource>((ref) {
  final dio = ref.read(dioClientProvider).dio;
  return AuthRemoteDataSource(dio);
});

class AuthRemoteDataSource {
  final Dio _dio;

  AuthRemoteDataSource(this._dio);

  Future<LoginResponse> login(String email, String password) async {
    final response = await _dio.post(
      ApiConstants.mobileLogin,
      data: {'email': email, 'password': password},
      options: Options(
        sendTimeout: const Duration(seconds: 8),
        receiveTimeout: const Duration(seconds: 8),
        validateStatus: (s) => s != null && s < 500,
      ),
    );
    final status = response.statusCode;
    final data = response.data;

    // Server mengirim { ok:false, code, message } untuk error (400/401/403/429).
    // Jangan pernah parse user/token dari payload error — itu yang menyebabkan
    // crash "type 'Null' is not a subtype of type 'Map<String, dynamic>'/'String'".
    if (data is! Map || data['ok'] != true || data['token'] is! String || data['user'] is! Map) {
      String message;
      if (data is Map && data['message'] is String && (data['message'] as String).trim().isNotEmpty) {
        message = data['message'] as String;
      } else if (status == null) {
        message = 'Tidak dapat terhubung ke server. Periksa koneksi internet.';
      } else {
        message = 'Login gagal (HTTP $status). Silakan coba lagi.';
      }
      throw ServerException(message: message, statusCode: status, data: data);
    }

    final userJson = Map<String, dynamic>.from(data['user'] as Map);
    return LoginResponse(
      user: UserModel.fromJson(userJson),
      token: data['token'] as String,
    );
  }

  Future<void> logout() async {
    try {
      await _dio.post(ApiConstants.logout, options: Options(validateStatus: (s) => s != null && s < 500));
    } on DioException catch (e) {
      if (e.response?.statusCode == 400 || e.response?.statusCode == 401 || e.response?.statusCode == 404) return;
      rethrow;
    } catch (_) {}
  }

  Future<UserModel> getCurrentUser() async {
    final response = await _dio.get('/auth/me');
    final data = response.data;
    if (data is! Map || data['user'] is! Map) {
      throw ServerException(
        message: (data is Map && data['message'] is String)
            ? data['message'] as String
            : 'Gagal memuat data pengguna.',
        statusCode: response.statusCode,
        data: data,
      );
    }
    return UserModel.fromJson(Map<String, dynamic>.from(data['user'] as Map));
  }

  Future<String> refreshToken(String refreshToken) async {
    final response = await _dio.post(ApiConstants.refreshToken, data: {
      'refreshToken': refreshToken,
    });
    return response.data['token'];
  }
}

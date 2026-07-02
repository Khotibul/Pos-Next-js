import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/constants/api_constants.dart';
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
    final response = await _dio.post(ApiConstants.mobileLogin, data: {
      'email': email,
      'password': password,
    });
    final data = response.data;
    return LoginResponse(
      user: UserModel.fromJson(data['user']),
      token: data['token'],
    );
  }

  Future<void> logout() async {
    await _dio.post(ApiConstants.logout);
  }

  Future<UserModel> getCurrentUser() async {
    final response = await _dio.get('/auth/me');
    return UserModel.fromJson(response.data['user']);
  }

  Future<String> refreshToken(String refreshToken) async {
    final response = await _dio.post(ApiConstants.refreshToken, data: {
      'refreshToken': refreshToken,
    });
    return response.data['token'];
  }
}

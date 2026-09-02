import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/dio_client.dart';

final tenantRemoteDataSourceProvider = Provider<TenantRemoteDataSource>((ref) {
  final dio = ref.read(dioClientProvider).dio;
  return TenantRemoteDataSource(dio);
});

class TenantRemoteDataSource {
  final Dio _dio;
  TenantRemoteDataSource(this._dio);

  Future<Map<String, dynamic>> getTenantPlan() async {
    try {
      final res = await _dio.get(
        '/mobile/tenant',
        options: Options(validateStatus: (s) => s != null && s < 500),
      );
      if (res.statusCode == 404) {
        // Backend belum deploy → fallback free tanpa throw (hindari spam log 404)
        return {
          'tenant': {'id': '', 'name': '', 'slug': 'free'},
          'plan': {'slug': 'starter', 'name': 'Starter'},
          'package': {'slug': 'starter', 'isFree': true, 'canUseDatabase': false, 'canSync': false},
        };
      }
      final data = res.data['data'] ?? res.data;
      if (data is Map<String, dynamic>) return data;
      return Map<String, dynamic>.from(data);
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) {
        return {
          'tenant': {'id': '', 'name': '', 'slug': 'free'},
          'plan': {'slug': 'starter', 'name': 'Starter'},
          'package': {'slug': 'starter', 'isFree': true, 'canUseDatabase': false, 'canSync': false},
        };
      }
      rethrow;
    }
  }
}

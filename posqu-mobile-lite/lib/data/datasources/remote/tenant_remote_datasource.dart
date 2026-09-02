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
    final res = await _dio.get('/mobile/tenant');
    // Backend returns {ok:true, data:{tenant:{...}, plan:{...}, package:{...}}}
    // withApiHandler wraps via apiOk -> {ok:true, data:{...}}
    final data = res.data['data'] ?? res.data;
    if (data is Map<String, dynamic>) return data;
    return Map<String, dynamic>.from(data);
  }
}

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/constants/api_constants.dart';
import '../../../core/network/dio_client.dart';

final syncRemoteDataSourceProvider = Provider<SyncRemoteDataSource>((ref) {
  final dio = ref.read(dioClientProvider).dio;
  return SyncRemoteDataSource(dio);
});

class SyncRemoteDataSource {
  final Dio _dio;

  SyncRemoteDataSource(this._dio);

  Future<Map<String, dynamic>> sendBatch(List<Map<String, dynamic>> items) async {
    final response = await _dio.post(ApiConstants.sync, data: {
      'items': items,
    });
    return response.data;
  }

  Future<List<Map<String, dynamic>>> pull({
    required String tableName,
    DateTime? lastSync,
  }) async {
    final params = <String, dynamic>{
      'table': tableName,
    };
    if (lastSync != null) {
      params['last_sync'] = lastSync.toIso8601String();
    }
    final response = await _dio.get(ApiConstants.sync, queryParameters: params);
    return List<Map<String, dynamic>>.from(response.data['data']);
  }

  Future<DateTime> getServerTime() async {
    final response = await _dio.get('${ApiConstants.sync}/time');
    return DateTime.parse(response.data['server_time']);
  }
}

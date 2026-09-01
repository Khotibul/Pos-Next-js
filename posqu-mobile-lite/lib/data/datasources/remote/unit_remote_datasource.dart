import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/constants/api_constants.dart';
import '../../../core/network/dio_client.dart';

final unitRemoteDataSourceProvider = Provider<UnitRemoteDataSource>((ref) {
  final dio = ref.read(dioClientProvider).dio;
  return UnitRemoteDataSource(dio);
});

class UnitRemoteDataSource {
  final Dio _dio;

  UnitRemoteDataSource(this._dio);

  /// Ambil daftar satuan dari server (database tenant).
  Future<List<String>> getUnits() async {
    final response = await _dio.get(ApiConstants.units);
    final data = response.data['data'] as List? ?? const [];
    return data
        .map((e) {
          final m = Map<String, dynamic>.from(e as Map);
          return m['name'] as String?;
        })
        .whereType<String>()
        .toList();
  }
}

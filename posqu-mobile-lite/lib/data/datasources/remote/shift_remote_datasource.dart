import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/constants/api_constants.dart';
import '../../../core/network/dio_client.dart';
import '../../../core/network/mobile_api_gate.dart';

final shiftRemoteDataSourceProvider = Provider<ShiftRemoteDataSource>((ref) {
  final dio = ref.read(dioClientProvider).dio;
  return ShiftRemoteDataSource(dio);
});

class ShiftRemoteDataSource {
  final Dio _dio;
  ShiftRemoteDataSource(this._dio);

  Future<Map<String, dynamic>> openShift(Map<String, dynamic> data) async {
    if (MobileApiGate.isDisabled('shifts')) throw DioException(requestOptions: RequestOptions(path: ApiConstants.cashierShifts), response: Response(requestOptions: RequestOptions(path: ''), statusCode: 501));
    try {
      final res = await _dio.post(ApiConstants.cashierShifts, data: data);
      return Map<String, dynamic>.from(res.data['data'] ?? res.data);
    } on DioException catch (e) {
      if (e.response?.statusCode == 404 || e.response?.statusCode == 501) MobileApiGate.disable('shifts');
      rethrow;
    }
  }

  Future<Map<String, dynamic>> closeShift(String id, Map<String, dynamic> data) async {
    if (MobileApiGate.isDisabled('shifts')) throw DioException(requestOptions: RequestOptions(path: ''), response: Response(requestOptions: RequestOptions(path: ''), statusCode: 501));
    try {
      final res = await _dio.post('${ApiConstants.cashierShifts}/$id/close', data: data);
      return Map<String, dynamic>.from(res.data['data'] ?? res.data);
    } on DioException catch (e) {
      if (e.response?.statusCode == 404 || e.response?.statusCode == 501) MobileApiGate.disable('shifts');
      rethrow;
    }
  }

  Future<Map<String, dynamic>?> getActiveShift(String cashierId) async {
    if (MobileApiGate.isDisabled('shifts')) return null;
    try {
      final res = await _dio.get(ApiConstants.cashierShifts, queryParameters: {'cashierId': cashierId, 'status': 'OPEN', 'limit': 1});
      final list = res.data['data'] as List?;
      if (list == null || list.isEmpty) return null;
      return Map<String, dynamic>.from(list.first);
    } on DioException catch (e) {
      if (e.response?.statusCode == 404 || e.response?.statusCode == 501) MobileApiGate.disable('shifts');
      return null;
    }
  }
}

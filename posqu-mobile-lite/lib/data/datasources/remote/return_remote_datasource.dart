import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/constants/api_constants.dart';
import '../../../core/network/dio_client.dart';
import '../../../core/network/mobile_api_gate.dart';

final returnRemoteDataSourceProvider = Provider<ReturnRemoteDataSource>((ref) {
  final dio = ref.read(dioClientProvider).dio;
  return ReturnRemoteDataSource(dio);
});

class ReturnRemoteDataSource {
  final Dio _dio;
  ReturnRemoteDataSource(this._dio);

  Future<void> createReturn(Map<String, dynamic> data) async {
    if (MobileApiGate.isDisabled('returns')) throw DioException(requestOptions: RequestOptions(path: ApiConstants.returns), response: Response(requestOptions: RequestOptions(path: ''), statusCode: 501));
    try {
      await _dio.post(ApiConstants.returns, data: data);
    } on DioException catch (e) {
      if (e.response?.statusCode == 404 || e.response?.statusCode == 501) MobileApiGate.disable('returns');
      rethrow;
    }
  }
}

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/constants/api_constants.dart';
import '../../../core/network/dio_client.dart';
import '../../../core/network/mobile_api_gate.dart';

final purchaseRemoteDataSourceProvider = Provider<PurchaseRemoteDataSource>((ref) {
  final dio = ref.read(dioClientProvider).dio;
  return PurchaseRemoteDataSource(dio);
});

class PurchaseRemoteDataSource {
  final Dio _dio;
  PurchaseRemoteDataSource(this._dio);

  Future<void> createPurchase(Map<String, dynamic> data) async {
    if (MobileApiGate.isDisabled('purchases')) throw DioException(requestOptions: RequestOptions(path: ApiConstants.purchases), response: Response(requestOptions: RequestOptions(path: ''), statusCode: 501));
    try {
      await _dio.post(ApiConstants.purchases, data: data);
    } on DioException catch (e) {
      if (e.response?.statusCode == 404 || e.response?.statusCode == 501) MobileApiGate.disable('purchases');
      rethrow;
    }
  }

  Future<List<Map<String, dynamic>>> getPurchases({int limit = 100}) async {
    if (MobileApiGate.isDisabled('purchases')) return [];
    try {
      final res = await _dio.get(ApiConstants.purchases, queryParameters: {'limit': limit});
      return List<Map<String, dynamic>>.from(res.data['data'] ?? []);
    } on DioException catch (e) {
      if (e.response?.statusCode == 404 || e.response?.statusCode == 501) MobileApiGate.disable('purchases');
      rethrow;
    }
  }
}

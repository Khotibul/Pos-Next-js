import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/constants/api_constants.dart';
import '../../../core/network/dio_client.dart';
import '../../../core/network/mobile_api_gate.dart';

final cashTransactionRemoteDataSourceProvider = Provider<CashTransactionRemoteDataSource>((ref) {
  final dio = ref.read(dioClientProvider).dio;
  return CashTransactionRemoteDataSource(dio);
});

class CashTransactionRemoteDataSource {
  final Dio _dio;
  CashTransactionRemoteDataSource(this._dio);

  Future<void> createTransaction(Map<String, dynamic> data) async {
    if (MobileApiGate.isDisabled('cashTransactions')) throw DioException(requestOptions: RequestOptions(path: ApiConstants.cashTransactions), response: Response(requestOptions: RequestOptions(path: ''), statusCode: 501));
    try {
      await _dio.post(ApiConstants.cashTransactions, data: data);
    } on DioException catch (e) {
      if (e.response?.statusCode == 404 || e.response?.statusCode == 501) MobileApiGate.disable('cashTransactions');
      rethrow;
    }
  }
}

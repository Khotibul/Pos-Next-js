import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/api_constants.dart';
import '../../../core/network/dio_client.dart';
import '../../models/payable_model.dart';

final payableRemoteDataSourceProvider = Provider<PayableRemoteDataSource>((ref) {
  final dio = ref.read(dioClientProvider).dio;
  return PayableRemoteDataSource(dio);
});

class PayableRemoteDataSource {
  final Dio _dio;
  PayableRemoteDataSource(this._dio);

  Future<List<PayableModel>> getPayables({int limit = 100, String? search, String? status}) async {
    final params = <String, dynamic>{'limit': limit};
    if (search != null && search.isNotEmpty) params['search'] = search;
    if (status != null && status.isNotEmpty) params['status'] = status;
    final response = await _dio.get(ApiConstants.payables, queryParameters: params);
    final data = response.data['data'];
    if (data is List) return data.map((e) => PayableModel.fromJson(e as Map<String, dynamic>)).toList();
    return [];
  }

  Future<PayableModel> createPayable(Map<String, dynamic> data) async {
    final response = await _dio.post(ApiConstants.payables, data: data);
    return PayableModel.fromJson(response.data['data'] as Map<String, dynamic>);
  }

  Future<void> createPayablePayment(Map<String, dynamic> data) async {
    await _dio.post('${ApiConstants.payables}/payments', data: data);
  }
}

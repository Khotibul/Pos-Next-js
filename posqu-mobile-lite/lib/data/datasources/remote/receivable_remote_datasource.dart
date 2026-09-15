import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/api_constants.dart';
import '../../../core/network/dio_client.dart';
import '../../models/receivable_model.dart';

final receivableRemoteDataSourceProvider = Provider<ReceivableRemoteDataSource>((ref) {
  final dio = ref.read(dioClientProvider).dio;
  return ReceivableRemoteDataSource(dio);
});

class ReceivableRemoteDataSource {
  final Dio _dio;
  ReceivableRemoteDataSource(this._dio);

  Future<List<ReceivableModel>> getReceivables({int limit = 100, String? search, String? status}) async {
    final params = <String, dynamic>{'limit': limit};
    if (search != null && search.isNotEmpty) params['search'] = search;
    if (status != null && status.isNotEmpty) params['status'] = status;
    final response = await _dio.get(ApiConstants.receivables, queryParameters: params);
    final data = response.data['data'];
    if (data is List) return data.map((e) => ReceivableModel.fromJson(e as Map<String, dynamic>)).toList();
    return [];
  }

  Future<ReceivableModel> createReceivable(Map<String, dynamic> data) async {
    final response = await _dio.post(ApiConstants.receivables, data: data);
    return ReceivableModel.fromJson(response.data['data'] as Map<String, dynamic>);
  }

  Future<void> createReceivablePayment(Map<String, dynamic> data) async {
    await _dio.post('${ApiConstants.receivables}/payments', data: data);
  }
}

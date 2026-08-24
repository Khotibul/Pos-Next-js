import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/constants/api_constants.dart';
import '../../../core/network/dio_client.dart';
import '../../models/sale_model.dart';

final saleRemoteDataSourceProvider = Provider<SaleRemoteDataSource>((ref) {
  final dio = ref.read(dioClientProvider).dio;
  return SaleRemoteDataSource(dio);
});

class SaleRemoteDataSource {
  final Dio _dio;

  SaleRemoteDataSource(this._dio);

  Future<List<SaleModel>> getSales({
    int page = 1,
    int limit = 20,
    String? search,
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    final params = <String, dynamic>{
      'page': page,
      'limit': limit,
    };
    if (search != null) params['search'] = search;
    if (startDate != null) params['start_date'] = startDate.toIso8601String();
    if (endDate != null) params['end_date'] = endDate.toIso8601String();

    final response = await _dio.get(ApiConstants.sales, queryParameters: params);
    return (response.data['data'] as List)
        .map((e) => SaleModel.fromJson(e))
        .toList();
  }

  Future<SaleModel> createSale(Map<String, dynamic> data) async {
    final response = await _dio.post(ApiConstants.sales, data: data);
    return SaleModel.fromJson(response.data['data']);
  }

  Future<void> deleteSale(String id) async {
    await _dio.delete('${ApiConstants.sales}/$id');
  }
}

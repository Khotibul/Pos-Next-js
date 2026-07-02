import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/constants/api_constants.dart';
import '../../../core/network/dio_client.dart';
import '../../models/customer_model.dart';

final customerRemoteDataSourceProvider = Provider<CustomerRemoteDataSource>((ref) {
  final dio = ref.read(dioClientProvider).dio;
  return CustomerRemoteDataSource(dio);
});

class CustomerRemoteDataSource {
  final Dio _dio;

  CustomerRemoteDataSource(this._dio);

  Future<List<CustomerModel>> getCustomers({
    int page = 1,
    int limit = 20,
    String? search,
  }) async {
    final params = <String, dynamic>{
      'page': page,
      'limit': limit,
    };
    if (search != null) params['search'] = search;

    final response = await _dio.get(ApiConstants.customers, queryParameters: params);
    return (response.data['data'] as List)
        .map((e) => CustomerModel.fromJson(e))
        .toList();
  }

  Future<CustomerModel> createCustomer(Map<String, dynamic> data) async {
    final response = await _dio.post(ApiConstants.customers, data: data);
    return CustomerModel.fromJson(response.data['data']);
  }

  Future<CustomerModel> updateCustomer(int id, Map<String, dynamic> data) async {
    final response = await _dio.put('${ApiConstants.customers}/$id', data: data);
    return CustomerModel.fromJson(response.data['data']);
  }

  Future<void> deleteCustomer(int id) async {
    await _dio.delete('${ApiConstants.customers}/$id');
  }
}

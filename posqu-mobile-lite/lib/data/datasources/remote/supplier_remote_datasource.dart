import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/constants/api_constants.dart';
import '../../../core/network/dio_client.dart';
import '../../models/supplier_model.dart';

final supplierRemoteDataSourceProvider = Provider<SupplierRemoteDataSource>((ref) {
  final dio = ref.read(dioClientProvider).dio;
  return SupplierRemoteDataSource(dio);
});

class SupplierRemoteDataSource {
  final Dio _dio;

  SupplierRemoteDataSource(this._dio);

  Future<List<SupplierModel>> getSuppliers({
    int page = 1,
    int limit = 20,
    String? search,
  }) async {
    final params = <String, dynamic>{
      'page': page,
      'limit': limit,
    };
    if (search != null) params['search'] = search;

    final response = await _dio.get(ApiConstants.suppliers, queryParameters: params);
    return (response.data['data'] as List)
        .map((e) => SupplierModel.fromJson(e))
        .toList();
  }

  Future<SupplierModel> createSupplier(Map<String, dynamic> data) async {
    final response = await _dio.post(ApiConstants.suppliers, data: data);
    return SupplierModel.fromJson(response.data['data']);
  }

  Future<SupplierModel> updateSupplier(String id, Map<String, dynamic> data) async {
    final response = await _dio.put('${ApiConstants.suppliers}/$id', data: data);
    return SupplierModel.fromJson(response.data['data']);
  }

  Future<void> deleteSupplier(String id) async {
    await _dio.delete('${ApiConstants.suppliers}/$id');
  }
}

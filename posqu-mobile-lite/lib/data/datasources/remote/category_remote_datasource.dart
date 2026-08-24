import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/constants/api_constants.dart';
import '../../../core/network/dio_client.dart';
import '../../models/category_model.dart';

final categoryRemoteDataSourceProvider = Provider<CategoryRemoteDataSource>((ref) {
  final dio = ref.read(dioClientProvider).dio;
  return CategoryRemoteDataSource(dio);
});

class CategoryRemoteDataSource {
  final Dio _dio;

  CategoryRemoteDataSource(this._dio);

  Future<List<CategoryModel>> getCategories({bool? activeOnly}) async {
    final params = <String, dynamic>{};
    if (activeOnly == true) params['active_only'] = true;

    final response = await _dio.get(ApiConstants.categories, queryParameters: params);
    return (response.data['data'] as List)
        .map((e) => CategoryModel.fromJson(e))
        .toList();
  }

  Future<CategoryModel> createCategory(Map<String, dynamic> data) async {
    final response = await _dio.post(ApiConstants.categories, data: data);
    return CategoryModel.fromJson(response.data['data']);
  }

  Future<CategoryModel> updateCategory(String id, Map<String, dynamic> data) async {
    final response = await _dio.put('${ApiConstants.categories}/$id', data: data);
    return CategoryModel.fromJson(response.data['data']);
  }

  Future<void> deleteCategory(String id) async {
    await _dio.delete('${ApiConstants.categories}/$id');
  }
}

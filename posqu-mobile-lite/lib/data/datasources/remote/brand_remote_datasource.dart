import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/constants/api_constants.dart';
import '../../../core/network/dio_client.dart';
import '../../models/brand_model.dart';

final brandRemoteDataSourceProvider = Provider<BrandRemoteDataSource>((ref) {
  final dio = ref.read(dioClientProvider).dio;
  return BrandRemoteDataSource(dio);
});

class BrandRemoteDataSource {
  final Dio _dio;

  BrandRemoteDataSource(this._dio);

  Future<List<BrandModel>> getBrands() async {
    final response = await _dio.get(ApiConstants.brands);
    return (response.data['data'] as List)
        .map((e) => BrandModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<BrandModel> createBrand(Map<String, dynamic> data) async {
    final response = await _dio.post(ApiConstants.brands, data: data);
    return BrandModel.fromJson(response.data['data'] as Map<String, dynamic>);
  }
}

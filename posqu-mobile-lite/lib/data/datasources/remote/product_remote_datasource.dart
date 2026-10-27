import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/constants/api_constants.dart';
import '../../../core/network/dio_client.dart';
import '../../models/product_model.dart';
import '../../models/product_variant_model.dart';

final productRemoteDataSourceProvider =
    Provider<ProductRemoteDataSource>((ref) {
  final dio = ref.read(dioClientProvider).dio;
  return ProductRemoteDataSource(dio);
});

class ProductRemoteDataSource {
  final Dio _dio;

  ProductRemoteDataSource(this._dio);

  Future<List<ProductModel>> getProducts({
    int page = 1,
    int limit = 20,
    String? search,
    int? categoryId,
  }) async {
    final params = <String, dynamic>{
      'page': page,
      'limit': limit,
    };
    if (search != null) params['search'] = search;
    if (categoryId != null) params['category_id'] = categoryId;

    final response =
        await _dio.get(ApiConstants.products, queryParameters: params);
    final data = response.data['data'];
    if (data == null || data is! List) return [];
    return data.map((e) => ProductModel.fromJson(e)).toList();
  }

  Future<ProductModel> getProduct(String id) async {
    final response = await _dio.get('${ApiConstants.products}/$id');
    final data = response.data['data'];
    if (data == null) throw Exception('Produk tidak ditemukan');
    return ProductModel.fromJson(data);
  }

  Future<ProductModel> getProductByBarcode(String barcode) async {
    final response =
        await _dio.get('${ApiConstants.products}/barcode/$barcode');
    final data = response.data['data'];
    if (data == null) {
      throw Exception('Produk dengan barcode $barcode tidak ditemukan');
    }
    return ProductModel.fromJson(data);
  }

  Future<ProductModel> createProduct(Map<String, dynamic> data) async {
    final response = await _dio.post(ApiConstants.products, data: data);
    return ProductModel.fromJson(response.data['data']);
  }

  Future<ProductModel> updateProduct(
      String id, Map<String, dynamic> data) async {
    final response = await _dio.put('${ApiConstants.products}/$id', data: data);
    return ProductModel.fromJson(response.data['data']);
  }

  Future<void> deleteProduct(String id) async {
    await _dio.delete('${ApiConstants.products}/$id');
  }

  Future<List<ProductVariantModel>> getVariants(String productId) async {
    final response =
        await _dio.get('${ApiConstants.products}/$productId/variants');
    final data = response.data['data'];
    if (data is! List) return [];
    return data
        .map((e) => ProductVariantModel.tryFromDynamic(e))
        .whereType<ProductVariantModel>()
        .toList();
  }

  Future<void> createVariant(
    String productId,
    Map<String, dynamic> data,
  ) async {
    await _dio.post('${ApiConstants.products}/$productId/variants', data: data);
  }

  Future<void> updateVariant(
    String productId,
    String variantId,
    Map<String, dynamic> data,
  ) async {
    await _dio.put(
      '${ApiConstants.products}/$productId/variants/$variantId',
      data: data,
    );
  }

  Future<void> deleteVariant(String productId, String variantId) async {
    await _dio.delete(
      '${ApiConstants.products}/$productId/variants/$variantId',
    );
  }
}

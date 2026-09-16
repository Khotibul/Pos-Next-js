import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/constants/api_constants.dart';
import '../../../core/network/dio_client.dart';
import '../../models/unit_model.dart';

final unitRemoteDataSourceProvider = Provider<UnitRemoteDataSource>((ref) {
  final dio = ref.read(dioClientProvider).dio;
  return UnitRemoteDataSource(dio);
});

class UnitRemoteDataSource {
  final Dio _dio;

  UnitRemoteDataSource(this._dio);

  Future<List<UnitModel>> getUnits() async {
    final response = await _dio.get(ApiConstants.units);
    return (response.data['data'] as List)
        .map((e) => UnitModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<UnitModel> createUnit(Map<String, dynamic> data) async {
    final response = await _dio.post(ApiConstants.units, data: data);
    return UnitModel.fromJson(response.data['data'] as Map<String, dynamic>);
  }
}

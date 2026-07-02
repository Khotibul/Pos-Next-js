import 'package:freezed_annotation/freezed_annotation.dart';

import '../../../domain/entities/product.dart';
import '../../../domain/entities/sale.dart';

part 'kasir_state.freezed.dart';

@freezed
class KasirState with _$KasirState {
  const factory KasirState({
    @Default([]) List<SaleItem> items,
    @Default(0.0) double subtotal,
    @Default(0.0) double discount,
    @Default(0.0) double tax,
    @Default(0.0) double total,
    @Default(0.0) double paidAmount,
    @Default(0.0) double changeAmount,
    @Default('cash') String paymentMethod,
    int? customerId,
    String? customerName,
    Product? scannedProduct,
    @Default(false) bool isScanning,
    @Default(false) bool isLoading,
    String? errorMessage,
  }) = _KasirState;
}

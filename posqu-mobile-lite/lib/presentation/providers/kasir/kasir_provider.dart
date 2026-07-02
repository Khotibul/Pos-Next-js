import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../data/repositories/sale_repository_impl.dart';
import '../../../data/repositories/product_repository_impl.dart';
import '../../../domain/repositories/product_repository.dart';
import '../../../domain/repositories/sale_repository.dart';
import '../../../domain/entities/product.dart';
import '../../../domain/entities/sale.dart';
import 'kasir_state.dart';

final kasirStateProvider = StateNotifierProvider<KasirNotifier, KasirState>((ref) {
  return KasirNotifier(
    saleRepository: ref.read(saleRepositoryProvider),
    productRepository: ref.read(productRepositoryProvider),
  );
});

class KasirNotifier extends StateNotifier<KasirState> {
  final SaleRepository _saleRepository;
  final ProductRepository _productRepository;

  KasirNotifier({
    required SaleRepository saleRepository,
    required ProductRepository productRepository,
  })  : _saleRepository = saleRepository,
        _productRepository = productRepository,
        super(const KasirState());

  void addProduct(Product product, {double quantity = 1}) {
    final existingIndex = state.items.indexWhere(
      (item) => item.productId == product.id,
    );

    if (existingIndex >= 0) {
      final existing = state.items[existingIndex];
      final newItems = List<SaleItem>.from(state.items);
      newItems[existingIndex] = SaleItem(
        id: existing.id,
        saleId: existing.saleId,
        productId: existing.productId,
        productName: existing.productName,
        productCode: existing.productCode,
        barcode: existing.barcode,
        quantity: existing.quantity + quantity,
        sellingPrice: existing.sellingPrice,
        discount: existing.discount,
        subtotal: (existing.quantity + quantity) * existing.sellingPrice - existing.discount,
        unit: existing.unit,
      );
      state = state.copyWith(items: newItems);
    } else {
      state = state.copyWith(items: [
        ...state.items,
        SaleItem(
          id: 0,
          saleId: 0,
          productId: product.id,
          productName: product.name,
          productCode: product.code,
          barcode: product.barcode,
          quantity: quantity,
          sellingPrice: product.sellingPrice,
          discount: 0,
          subtotal: quantity * product.sellingPrice,
          unit: product.unit,
        ),
      ]);
    }
    _recalculate();
  }

  void removeItem(int index) {
    if (index >= 0 && index < state.items.length) {
      final newItems = List<SaleItem>.from(state.items)..removeAt(index);
      state = state.copyWith(items: newItems);
      _recalculate();
    }
  }

  void updateQuantity(int index, double quantity) {
    if (index >= 0 && index < state.items.length) {
      final item = state.items[index];
      final newItems = List<SaleItem>.from(state.items);
      newItems[index] = SaleItem(
        id: item.id,
        saleId: item.saleId,
        productId: item.productId,
        productName: item.productName,
        productCode: item.productCode,
        barcode: item.barcode,
        quantity: quantity,
        sellingPrice: item.sellingPrice,
        discount: item.discount,
        subtotal: quantity * item.sellingPrice - item.discount,
        unit: item.unit,
      );
      state = state.copyWith(items: newItems);
      _recalculate();
    }
  }

  void setDiscount(double discount) {
    state = state.copyWith(discount: discount);
    _recalculate();
  }

  void setPaymentMethod(String method) {
    state = state.copyWith(paymentMethod: method);
  }

  void setPaidAmount(double amount) {
    state = state.copyWith(
      paidAmount: amount,
      changeAmount: amount - state.total,
    );
  }

  Future<bool> checkout(int userId) async {
    state = state.copyWith(isLoading: true);
    try {
      final invoiceNumber = 'INV-${DateTime.now().millisecondsSinceEpoch}';
      final sale = Sale(
        id: 0,
        invoiceNumber: invoiceNumber,
        userId: userId,
        saleDate: DateTime.now(),
        status: 'completed',
        paymentMethod: state.paymentMethod,
        subtotal: state.subtotal,
        discount: state.discount,
        tax: state.tax,
        total: state.total,
        paidAmount: state.paidAmount,
        changeAmount: state.changeAmount,
        items: List.from(state.items),
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      );

      final result = await _saleRepository.createSale(sale);
      return result.fold(
        (failure) {
          state = state.copyWith(isLoading: false, errorMessage: failure.message);
          return false;
        },
        (createdSale) {
          _reset();
          return true;
        },
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.toString());
      return false;
    }
  }

  void scanBarcode(String barcode) async {
    state = state.copyWith(isScanning: true);
    final result = await _productRepository.getProductByBarcode(barcode);
    result.fold(
      (failure) => state = state.copyWith(isScanning: false, errorMessage: failure.message),
      (product) {
        addProduct(product);
        state = state.copyWith(isScanning: false, scannedProduct: product);
      },
    );
  }

  void _recalculate() {
    final subtotal = state.items.fold<double>(0, (sum, item) => sum + item.subtotal);
    final discountAmount = subtotal * (state.discount / 100);
    final taxAmount = (subtotal - discountAmount) * (state.tax / 100);
    final total = subtotal - discountAmount + taxAmount;
    final change = state.paidAmount - total;

    state = state.copyWith(
      subtotal: subtotal,
      total: total,
      changeAmount: change > 0 ? change : 0,
    );
  }

  void _reset() {
    state = const KasirState();
  }

  void clearError() {
    state = state.copyWith(errorMessage: null);
  }
}

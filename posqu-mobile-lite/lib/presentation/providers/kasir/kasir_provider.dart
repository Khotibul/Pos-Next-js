import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';

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
        name: existing.name,
        sku: existing.sku,
        barcode: existing.barcode,
        qty: existing.qty + quantity,
        price: existing.price,
        lineTotal: (existing.qty + quantity) * existing.price,
        unit: existing.unit,
      );
      state = state.copyWith(items: newItems);
    } else {
      state = state.copyWith(items: [
        ...state.items,
        SaleItem(
          id: const Uuid().v4(),
          saleId: '',
          productId: product.id,
          name: product.name,
          sku: product.sku,
          barcode: product.barcode,
          qty: quantity,
          price: product.sellingPrice,
          lineTotal: quantity * product.sellingPrice,
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

  void updateQuantity(int index, double qty) {
    if (index >= 0 && index < state.items.length) {
      final item = state.items[index];
      final newItems = List<SaleItem>.from(state.items);
      newItems[index] = SaleItem(
        id: item.id,
        saleId: item.saleId,
        productId: item.productId,
        name: item.name,
        sku: item.sku,
        barcode: item.barcode,
        qty: qty,
        price: item.price,
        lineTotal: qty * item.price,
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

  Future<bool> checkout(String cashierId) async {
    state = state.copyWith(isLoading: true);
    try {
      final now = DateTime.now();
      final invoiceNo = 'INV-${now.millisecondsSinceEpoch}';
      final saleId = const Uuid().v4();
      final items = state.items
          .map((item) => item.copyWith(saleId: saleId))
          .toList();
      final sale = Sale(
        id: saleId,
        invoiceNo: invoiceNo,
        cashierId: cashierId.isEmpty ? null : cashierId,
        createdAt: now,
        status: 'PAID',
        paymentMethod: state.paymentMethod,
        subtotal: state.subtotal,
        discount: state.discount,
        tax: state.tax,
        total: state.total,
        paidAmount: state.paidAmount,
        changeAmount: state.changeAmount,
        items: items,
        updatedAt: now,
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
    final subtotal = state.items.fold<double>(0, (sum, item) => sum + item.lineTotal);
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

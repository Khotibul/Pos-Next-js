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

  /// Cache produk yang pernah ditambahkan ke keranjang agar perubahan qty
  /// bisa menghitung ulang harga grosir tanpa query ulang.
  final Map<String, Product> _productCache = {};

  KasirNotifier({
    required SaleRepository saleRepository,
    required ProductRepository productRepository,
  })  : _saleRepository = saleRepository,
        _productRepository = productRepository,
        super(const KasirState());

  double _priceFor(Product product, double qty) {
    final hasWholesale = product.wholesalePrice > 0 &&
        product.wholesaleMinQty > 0 &&
        qty >= product.wholesaleMinQty;
    return hasWholesale ? product.wholesalePrice : product.sellingPrice;
  }

  bool isWholesalePrice(Product product, double price) {
    return product.wholesalePrice > 0 &&
        product.wholesaleMinQty > 0 &&
        price <= product.wholesalePrice;
  }

  Product? cachedProduct(String productId) => _productCache[productId];

  void addProduct(Product product, {double quantity = 1}) {
    _productCache[product.id] = product;
    final unitPrice = _priceFor(product, quantity);

    final existingIndex = state.items.indexWhere(
      (item) => item.productId == product.id,
    );

    if (existingIndex >= 0) {
      final existing = state.items[existingIndex];
      final newQty = existing.qty + quantity;
      final newPrice = _priceFor(product, newQty);
      final newItems = List<SaleItem>.from(state.items);
      newItems[existingIndex] = SaleItem(
        id: existing.id,
        saleId: existing.saleId,
        productId: existing.productId,
        name: existing.name,
        sku: existing.sku,
        barcode: existing.barcode,
        qty: newQty,
        price: newPrice,
        lineTotal: newQty * newPrice,
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
          price: unitPrice,
          lineTotal: quantity * unitPrice,
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
    if (index < 0 || index >= state.items.length) return;
    final item = state.items[index];
    if (qty <= 0) {
      removeItem(index);
      return;
    }
    final product = _productCache[item.productId];
    final price = product != null ? _priceFor(product, qty) : item.price;
    final newItems = List<SaleItem>.from(state.items);
    newItems[index] = SaleItem(
      id: item.id,
      saleId: item.saleId,
      productId: item.productId,
      name: item.name,
      sku: item.sku,
      barcode: item.barcode,
      qty: qty,
      price: price,
      lineTotal: qty * price,
      unit: item.unit,
    );
    state = state.copyWith(items: newItems);
    _recalculate();
  }

  void incrementQuantity(int index, {double step = 1}) {
    if (index < 0 || index >= state.items.length) return;
    updateQuantity(index, state.items[index].qty + step);
  }

  void decrementQuantity(int index, {double step = 1}) {
    if (index < 0 || index >= state.items.length) return;
    updateQuantity(index, state.items[index].qty - step);
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
          for (final item in items) {
            final product = _productCache[item.productId];
            if (product != null && product.stock > 0) {
              _productRepository.updateStock(
                product.id,
                product.stock - item.qty.toInt(),
              );
            }
          }
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

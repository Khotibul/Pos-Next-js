import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';

import '../../../data/repositories/sale_repository_impl.dart';
import '../../../data/repositories/product_repository_impl.dart';
import '../../../data/repositories/setting_repository_impl.dart';
import '../../../domain/repositories/setting_repository.dart';
import '../../../data/datasources/local/hive_cache.dart';
import '../../../domain/repositories/product_repository.dart';
import '../../../domain/repositories/sale_repository.dart';
import '../../../domain/entities/product.dart';
import '../../../domain/entities/sale.dart';
import '../../../core/widgets/receipt_preview.dart';
import 'kasir_state.dart';

final kasirStateProvider = StateNotifierProvider<KasirNotifier, KasirState>((ref) {
  return KasirNotifier(
    saleRepository: ref.read(saleRepositoryProvider),
    productRepository: ref.read(productRepositoryProvider),
    settingRepository: ref.read(settingRepositoryProvider),
    cache: ref.read(hiveCacheProvider),
  );
});

class SavedCart {
  final String id;
  final String name;
  final DateTime createdAt;
  final List<SaleItem> items;
  final double discount;

  const SavedCart({
    required this.id,
    required this.name,
    required this.createdAt,
    required this.items,
    this.discount = 0,
  });

  double get total =>
      items.fold(0.0, (sum, i) => sum + i.lineTotal) *
      (1 - (discount / 100));

  Map<String, dynamic> toMap() => {
        'id': id,
        'name': name,
        'createdAt': createdAt.toIso8601String(),
        'discount': discount,
        'items': items
            .map((i) => {
                  'id': i.id,
                  'saleId': i.saleId,
                  'productId': i.productId,
                  'name': i.name,
                  'sku': i.sku,
                  'barcode': i.barcode,
                  'qty': i.qty,
                  'price': i.price,
                  'lineTotal': i.lineTotal,
                  'unit': i.unit,
                })
            .toList(),
      };

  static SavedCart fromMap(Map<String, dynamic> m) => SavedCart(
        id: m['id'] as String,
        name: m['name'] as String? ?? 'Keranjang',
        createdAt: DateTime.tryParse(m['createdAt'] as String? ?? '') ??
            DateTime.now(),
        discount: (m['discount'] as num?)?.toDouble() ?? 0,
        items: ((m['items'] as List?) ?? const [])
            .map((e) => SaleItem(
                  id: e['id'] as String? ?? '',
                  saleId: '',
                  productId: e['productId'] as String? ?? '',
                  name: e['name'] as String? ?? '',
                  sku: e['sku'] as String? ?? '',
                  barcode: e['barcode'] as String?,
                  qty: (e['qty'] as num?)?.toDouble() ?? 1,
                  price: (e['price'] as num?)?.toDouble() ?? 0,
                  lineTotal: (e['lineTotal'] as num?)?.toDouble() ?? 0,
                  unit: e['unit'] as String?,
                ))
            .toList(),
      );
}

class KasirNotifier extends StateNotifier<KasirState> {
  final SaleRepository _saleRepository;
  final ProductRepository _productRepository;
  final SettingRepository _settingRepository;
  final HiveCache _cache;

  static const String _savedCartsKey = 'saved_carts';

  /// Cache produk yang pernah ditambahkan ke keranjang agar perubahan qty
  /// bisa menghitung ulang harga grosir tanpa query ulang.
  final Map<String, Product> _productCache = {};

  KasirNotifier({
    required SaleRepository saleRepository,
    required ProductRepository productRepository,
    required SettingRepository settingRepository,
    required HiveCache cache,
  })  : _saleRepository = saleRepository,
        _productRepository = productRepository,
        _settingRepository = settingRepository,
        _cache = cache,
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

  Future<Sale?> checkout(String cashierId) async {
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
      Sale? saved;
      result.fold(
        (failure) {
          state = state.copyWith(isLoading: false, errorMessage: failure.message);
          saved = null;
        },
        (createdSale) {
          saved = sale;
        },
      );

      if (saved != null) {
        for (final item in items) {
          final product = _productCache[item.productId];
          if (product != null && product.stock > 0) {
            _productRepository.updateStock(
              product.id,
              product.stock - item.qty.toInt(),
            );
          }
        }
        final config = await getReceiptConfig();
        state = state.copyWith(isLoading: false);
        _reset();
        if (config.autoPrintAfterPayment) {
          await printReceipt(sale, config);
        }
      }
      return saved;
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.toString());
      return null;
    }
  }

  Future<ReceiptConfig> getReceiptConfig() async {
    final result = await _settingRepository.getPrinterConfig();
    return ReceiptConfig.fromMap(result.fold((_) => null, (c) => c));
  }

  // ================= SIMPAN KERANJANG =================

  List<SavedCart> _readSavedCarts() {
    final raw = _cache.getCache(_savedCartsKey);
    if (raw is List) {
      return raw
          .whereType<Map>()
          .map((m) => SavedCart.fromMap(Map<String, dynamic>.from(m)))
          .toList();
    }
    return [];
  }

  Future<void> _writeSavedCarts(List<SavedCart> carts) async {
    await _cache.setCache(
      _savedCartsKey,
      carts.map((c) => c.toMap()).toList(),
    );
  }

  List<SavedCart> getSavedCarts() => _readSavedCarts();

  Future<void> saveCurrentCart(String name) async {
    if (state.items.isEmpty) return;
    final carts = _readSavedCarts();
    carts.insert(
      0,
      SavedCart(
        id: const Uuid().v4(),
        name: name.trim().isEmpty
            ? 'Keranjang ${carts.length + 1}'
            : name.trim(),
        createdAt: DateTime.now(),
        items: List.from(state.items),
        discount: state.discount,
      ),
    );
    await _writeSavedCarts(carts.take(50).toList());
    _reset();
  }

  Future<void> loadSavedCart(SavedCart cart) async {
    for (final item in cart.items) {
      if (!_productCache.containsKey(item.productId)) {
        final result = await _productRepository.getProduct(item.productId);
        result.fold((_) {}, (p) => _productCache[item.productId] = p);
      }
    }
    state = state.copyWith(
      items: cart.items,
      discount: cart.discount,
    );
    _recalculate();
    final carts = _readSavedCarts()..removeWhere((c) => c.id == cart.id);
    await _writeSavedCarts(carts);
  }

  Future<void> deleteSavedCart(String id) async {
    final carts = _readSavedCarts()..removeWhere((c) => c.id == id);
    await _writeSavedCarts(carts);
  }

  /// Scan barcode/SKU -> cari produk -> langsung masuk keranjang.
  /// Mengembalikan produk yang ditemukan, atau null bila tidak ada.
  Future<Product?> scanBarcode(String code) async {
    state = state.copyWith(isScanning: true);
    final result = await _productRepository.getProductByBarcode(code);
    return result.fold(
      (failure) {
        state = state.copyWith(
          isScanning: false,
          errorMessage: failure.message,
        );
        return null;
      },
      (product) {
        addProduct(product);
        state = state.copyWith(
          isScanning: false,
          scannedProduct: product,
          errorMessage: null,
        );
        return product;
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

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

final kasirStateProvider =
    StateNotifierProvider<KasirNotifier, KasirState>((ref) {
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
      items.fold(0.0, (sum, i) => sum + i.lineTotal) * (1 - (discount / 100));

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
                  'variantId': i.variantId,
                  'variantName': i.variantName,
                  'name': i.name,
                  'sku': i.sku,
                  'barcode': i.barcode,
                  'qty': i.qty,
                  'price': i.price,
                  'lineTotal': i.lineTotal,
                  'unit': i.unit,
                  'priceOverridden': i.priceOverridden,
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
                  variantId: e['variantId'] as String?,
                  variantName: e['variantName'] as String?,
                  name: e['name'] as String? ?? '',
                  sku: e['sku'] as String? ?? '',
                  barcode: e['barcode'] as String?,
                  qty: (e['qty'] as num?)?.toDouble() ?? 1,
                  price: (e['price'] as num?)?.toDouble() ?? 0,
                  lineTotal: (e['lineTotal'] as num?)?.toDouble() ?? 0,
                  unit: e['unit'] as String?,
                  priceOverridden: e['priceOverridden'] as bool? ?? false,
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

  double _priceFor(Product product, double qty, {ProductVariant? variant}) {
    final isWholesaleCustomer = state.isWholesaleCustomer;
    final basePrice = variant?.price ?? product.sellingPrice;
    final meetsMinQty =
        product.wholesaleMinQty > 0 && qty >= product.wholesaleMinQty;
    final wholesaleActive = isWholesaleCustomer || meetsMinQty;

    if (variant != null) {
      if (wholesaleActive && product.wholesaleDiscountPercent > 0) {
        return basePrice * (1 - product.wholesaleDiscountPercent / 100);
      }
      return basePrice;
    }

    // Pelanggan grosir: harga grosir tanpa minimal qty, atau diskon persen
    if (isWholesaleCustomer) {
      if (product.wholesalePrice > 0) return product.wholesalePrice;
      if (product.wholesaleDiscountPercent > 0) {
        return product.sellingPrice *
            (1 - product.wholesaleDiscountPercent / 100);
      }
    }
    final hasWholesale = product.wholesalePrice > 0 && meetsMinQty;
    if (hasWholesale) return product.wholesalePrice;
    if (meetsMinQty && product.wholesaleDiscountPercent > 0) {
      return basePrice * (1 - product.wholesaleDiscountPercent / 100);
    }
    return product.sellingPrice;
  }

  ProductVariant? _variantFor(SaleItem item) {
    if (item.variantId == null) return null;
    final product = _productCache[item.productId];
    if (product == null) return null;
    for (final variant in product.variants) {
      if (variant.id == item.variantId) return variant;
    }
    return null;
  }

  double basePriceFor(SaleItem item) {
    final product = _productCache[item.productId];
    if (product == null) return item.price;
    return _priceFor(product, item.qty, variant: _variantFor(item));
  }

  bool isLineWholesale(SaleItem item) {
    if (item.priceOverridden) return false;
    final product = _productCache[item.productId];
    if (product == null) return false;
    final variant = _variantFor(item);
    final basePrice = variant?.price ?? product.sellingPrice;
    final qualifies = state.isWholesaleCustomer ||
        (product.wholesaleMinQty > 0 && item.qty >= product.wholesaleMinQty);
    return qualifies && item.price < basePrice;
  }

  bool isWholesalePrice(Product product, double price) {
    if (state.isWholesaleCustomer &&
        product.wholesalePrice > 0 &&
        price <= product.wholesalePrice) {
      return true;
    }
    return product.wholesalePrice > 0 &&
        product.wholesaleMinQty > 0 &&
        price <= product.wholesalePrice;
  }

  void setCustomer({String? id, String? name, bool isWholesale = false}) {
    state = state.copyWith(
      customerId: id,
      customerName: name,
      isWholesaleCustomer: isWholesale,
    );
    // Hitung ulang harga semua item saat ganti pelanggan (grosir ↔ retail)
    if (state.items.isNotEmpty) {
      final newItems = <SaleItem>[];
      for (final item in state.items) {
        final product = _productCache[item.productId];
        if (product != null && !item.priceOverridden) {
          final variant = _variantFor(item);
          final newPrice = _priceFor(product, item.qty, variant: variant);
          newItems.add(
              item.copyWith(price: newPrice, lineTotal: item.qty * newPrice));
        } else {
          newItems.add(item);
        }
      }
      state = state.copyWith(items: newItems);
      _recalculate();
    }
  }

  void clearCustomer() => setCustomer(id: null, name: null, isWholesale: false);

  Product? cachedProduct(String productId) => _productCache[productId];

  void addProduct(
    Product product, {
    ProductVariant? variant,
    double quantity = 1,
  }) {
    _productCache[product.id] = product;
    final unitPrice = _priceFor(product, quantity, variant: variant);

    final existingIndex = state.items.indexWhere(
      (item) => item.productId == product.id && item.variantId == variant?.id,
    );

    if (existingIndex >= 0) {
      final existing = state.items[existingIndex];
      final newQty = existing.qty + quantity;
      final newPrice = existing.priceOverridden
          ? existing.price
          : _priceFor(product, newQty, variant: variant);
      final newItems = List<SaleItem>.from(state.items);
      newItems[existingIndex] = existing.copyWith(
        qty: newQty,
        price: newPrice,
        lineTotal: newQty * newPrice,
      );
      state = state.copyWith(items: newItems);
    } else {
      state = state.copyWith(items: [
        ...state.items,
        SaleItem(
          id: const Uuid().v4(),
          saleId: '',
          productId: product.id,
          variantId: variant?.id,
          variantName: variant?.name,
          name: product.name,
          sku: variant?.sku ?? product.sku,
          barcode: variant?.barcode ?? product.barcode,
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
    final variant = _variantFor(item);
    final price = item.priceOverridden
        ? item.price
        : (product != null
            ? _priceFor(product, qty, variant: variant)
            : item.price);
    final newItems = List<SaleItem>.from(state.items);
    newItems[index] = item.copyWith(
      qty: qty,
      price: price,
      lineTotal: qty * price,
    );
    state = state.copyWith(items: newItems);
    _recalculate();
  }

  void setItemPrice(int index, double price) {
    if (index < 0 || index >= state.items.length) return;
    final normalized = price.isFinite && price >= 0 ? price : 0.0;
    final item = state.items[index];
    final newItems = List<SaleItem>.from(state.items);
    newItems[index] = item.copyWith(
      price: normalized,
      lineTotal: normalized * item.qty,
      priceOverridden: true,
    );
    state = state.copyWith(items: newItems);
    _recalculate();
  }

  void resetItemPrice(int index) {
    if (index < 0 || index >= state.items.length) return;
    final item = state.items[index];
    final product = _productCache[item.productId];
    final variant = _variantFor(item);
    final price = product != null
        ? _priceFor(product, item.qty, variant: variant)
        : item.price;
    final newItems = List<SaleItem>.from(state.items);
    newItems[index] = item.copyWith(
      price: price,
      lineTotal: price * item.qty,
      priceOverridden: false,
    );
    state = state.copyWith(items: newItems);
    _recalculate();
  }

  void incrementQuantity(int index, {double? step}) {
    if (index < 0 || index >= state.items.length) return;
    final item = state.items[index];
    final product = _productCache[item.productId];
    final unit = product?.unit ?? item.unit ?? 'pcs';
    final isFractional = ['kg', 'g', 'gram', 'liter', 'l', 'ml', 'meter', 'm']
        .contains(unit.toLowerCase());
    final s = step ?? (isFractional ? 0.5 : 1.0);
    updateQuantity(index, item.qty + s);
  }

  void decrementQuantity(int index, {double? step}) {
    if (index < 0 || index >= state.items.length) return;
    final item = state.items[index];
    final product = _productCache[item.productId];
    final unit = product?.unit ?? item.unit ?? 'pcs';
    final isFractional = ['kg', 'g', 'gram', 'liter', 'l', 'ml', 'meter', 'm']
        .contains(unit.toLowerCase());
    final s = step ?? (isFractional ? 0.5 : 1.0);
    updateQuantity(index, item.qty - s);
  }

  void setDiscount(double discount) {
    state = state.copyWith(discount: discount);
    _recalculate();
  }

  void setPaymentMethod(String method) {
    state = state.copyWith(paymentMethod: method);
  }

  void setPaidAmount(double amount) {
    final paidAmount = amount.isFinite && amount > 0 ? amount : 0.0;
    final changeAmount = paidAmount - state.total;
    state = state.copyWith(
      paidAmount: paidAmount,
      changeAmount: changeAmount > 0 ? changeAmount : 0,
    );
  }

  Future<Sale?> checkout(String cashierId, {String? shiftId}) async {
    state = state.copyWith(isLoading: true);
    try {
      final paidAmount = state.paidAmount;
      final changeAmount = paidAmount - state.total;
      final now = DateTime.now();
      final invoiceNo = 'INV-${now.millisecondsSinceEpoch}';
      final saleId = const Uuid().v4();
      final items =
          state.items.map((item) => item.copyWith(saleId: saleId)).toList();
      final sale = Sale(
        id: saleId,
        invoiceNo: invoiceNo,
        cashierId: cashierId.isEmpty ? null : cashierId,
        shiftId: shiftId,
        customerId: state.customerId,
        customerName: state.customerName,
        createdAt: now,
        status: 'PAID',
        paymentMethod: state.paymentMethod,
        subtotal: state.subtotal,
        discount: state.discount,
        tax: state.tax,
        total: state.total,
        paidAmount: paidAmount,
        changeAmount: changeAmount > 0 ? changeAmount : 0,
        items: items,
        updatedAt: now,
      );

      final result = await _saleRepository.createSale(sale);
      Sale? saved;
      result.fold(
        (failure) {
          state =
              state.copyWith(isLoading: false, errorMessage: failure.message);
          saved = null;
        },
        (createdSale) {
          saved = sale;
        },
      );

      if (saved != null) {
        final config = await getReceiptConfig();
        state = state.copyWith(isLoading: false);
        _reset();
        if (config.autoPrintAfterPayment) {
          try {
            await printReceipt(sale, config, fallbackToSystem: false);
          } catch (_) {
            // Printer tidak siap -> transaksi tetap sukses.
          }
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
        name:
            name.trim().isEmpty ? 'Keranjang ${carts.length + 1}' : name.trim(),
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

  /// Cari produk/varian dari barcode/SKU/QR tanpa langsung menambah ke cart.
  Future<({Product? product, ProductVariant? variant})> lookupCode(
    String code,
  ) async {
    final value = code.trim();
    if (value.isEmpty) return (product: null, variant: null);

    final local = await _productRepository.getProducts(limit: 10000);
    Product? matchedProduct;
    ProductVariant? matchedVariant;
    local.fold((_) {}, (products) {
      for (final product in products) {
        if (product.barcode == value ||
            product.qrCode == value ||
            product.sku == value) {
          matchedProduct = product;
          matchedVariant = product.variantByCode(value);
          return;
        }
      }
      for (final product in products) {
        final variant = product.variantByCode(value);
        if (variant != null) {
          matchedProduct = product;
          matchedVariant = variant;
          return;
        }
      }
    });

    if (matchedProduct == null) {
      final remote = await _productRepository.getProductByBarcode(value);
      remote.fold((_) {}, (product) {
        matchedProduct = product;
        matchedVariant = product.variantByCode(value);
      });
    }

    if (matchedProduct != null) {
      _productCache[matchedProduct!.id] = matchedProduct!;
    }
    return (product: matchedProduct, variant: matchedVariant);
  }

  /// Scan barcode/SKU -> cari produk -> langsung masuk keranjang.
  /// Mengembalikan produk yang ditemukan, atau null bila tidak ada.
  Future<Product?> scanBarcode(String code) async {
    state = state.copyWith(isScanning: true);
    final result = await lookupCode(code);
    if (result.product == null) {
      state = state.copyWith(
        isScanning: false,
        errorMessage: 'Produk dengan barcode $code tidak ditemukan',
      );
      return null;
    }
    var variant = result.variant;
    if (variant == null && result.product!.variants.isNotEmpty) {
      final available = result.product!.variants.where((v) => !v.isOutOfStock);
      if (available.isEmpty) {
        state = state.copyWith(
          isScanning: false,
          errorMessage: 'Semua varian produk ini stoknya habis.',
        );
        return null;
      }
      variant = available.first;
    }
    addProduct(result.product!, variant: variant);
    state = state.copyWith(
      isScanning: false,
      scannedProduct: result.product,
      errorMessage: null,
    );
    return result.product;
  }

  void _recalculate() {
    final subtotal =
        state.items.fold<double>(0, (sum, item) => sum + item.lineTotal);
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

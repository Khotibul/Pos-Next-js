import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../providers/kasir/kasir_provider.dart';
import '../../providers/kasir/kasir_state.dart';
import '../../providers/product/product_provider.dart';
import '../../../core/widgets/receipt_preview.dart';
import '../../../core/utils/currency_formatter.dart';
import '../../../core/widgets/app_button.dart';
import '../../../core/widgets/barcode_scanner_sheet.dart';
import '../../../core/widgets/product_image.dart';
import '../../../domain/entities/product.dart';

class KasirScreen extends ConsumerStatefulWidget {
  const KasirScreen({super.key});

  @override
  ConsumerState<KasirScreen> createState() => _KasirScreenState();
}

class _KasirScreenState extends ConsumerState<KasirScreen> {
  final _searchController = TextEditingController();
  String _query = '';

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final kasirState = ref.watch(kasirStateProvider);
    final productsAsync = ref.watch(productListProvider);
    final isLandscape =
        MediaQuery.of(context).size.width >= 900;

    final products = (productsAsync.valueOrNull ?? const <Product>[])
        .where((p) =>
            _query.isEmpty ||
            p.name.toLowerCase().contains(_query.toLowerCase()) ||
            p.sku.toLowerCase().contains(_query.toLowerCase()) ||
            (p.barcode ?? '').contains(_query))
        .toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Kasir'),
        automaticallyImplyLeading: false,
        actions: [
          IconButton(
            tooltip: 'Scan Barcode',
            icon: const Icon(Icons.qr_code_scanner),
            onPressed: _scanAndAddToCart,
          ),
          IconButton(
            tooltip: 'Simpan Keranjang',
            icon: const Icon(Icons.bookmark_add_outlined),
            onPressed: kasirState.items.isEmpty
                ? null
                : () => _showSaveCartDialog(),
          ),
          IconButton(
            tooltip: 'Keranjang Tersimpan',
            icon: const Icon(Icons.bookmarks_outlined),
            onPressed: _showSavedCartsSheet,
          ),
        ],
      ),
      body: isLandscape ? _buildLandscape(kasirState, products) : _buildPortrait(kasirState, products),
    );
  }

  // ================= PORTRAIT =================

  Widget _buildPortrait(KasirState kasirState, List<Product> products) {
    return Column(
      children: [
        _buildSearchBar(),
        Expanded(
          child: _buildProductList(products, compact: true),
        ),
        const Divider(height: 1),
        _buildBottomCartBar(kasirState),
      ],
    );
  }

  Widget _buildBottomCartBar(KasirState kasirState) {
    final itemCount = kasirState.items.length;
    return SafeArea(
      top: false,
      child: Container(
        padding: const EdgeInsets.fromLTRB(16, 10, 16, 10),
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surface,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.06),
              blurRadius: 8,
              offset: const Offset(0, -2),
            ),
          ],
        ),
        child: Row(
          children: [
            Stack(
              clipBehavior: Clip.none,
              children: [
                IconButton.filledTonal(
                  onPressed: () => _openCartSheet(kasirState),
                  icon: const Icon(Icons.shopping_cart_outlined),
                ),
                if (itemCount > 0)
                  Positioned(
                    right: -4,
                    top: -4,
                    child: Badge(
                      label: Text('$itemCount'),
                      backgroundColor: Theme.of(context).colorScheme.primary,
                    ),
                  ),
              ],
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    '$itemCount item',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                  Text(
                    CurrencyFormatter.format(kasirState.total),
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            AppButton(
              label: 'Bayar',
              loading: kasirState.isLoading,
              onPressed: kasirState.items.isEmpty
                  ? null
                  : () => _openCartSheet(kasirState),
            ),
          ],
        ),
      ),
    );
  }

  void _openCartSheet(KasirState kasirState) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (sheetContext) {
        return PopScope(
          onPopInvokedWithResult: (didPop, _) {
            if (!didPop && mounted) setState(() {});
          },
          child: Consumer(
            builder: (context, sheetRef, _) {
              final state = sheetRef.watch(kasirStateProvider);
              return SafeArea(
                child: Padding(
                  padding: EdgeInsets.only(
                    bottom: MediaQuery.of(sheetContext).viewInsets.bottom,
                  ),
                  child: ConstrainedBox(
                    constraints: BoxConstraints(
                      maxHeight:
                          MediaQuery.of(sheetContext).size.height * 0.75,
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Padding(
                          padding: const EdgeInsets.all(16),
                          child: Row(
                            children: [
                              Text('Keranjang',
                                  style: Theme.of(sheetContext)
                                      .textTheme
                                      .titleMedium
                                      ?.copyWith(fontWeight: FontWeight.bold)),
                              const Spacer(),
                              IconButton(
                                icon: const Icon(Icons.close),
                                onPressed: () => Navigator.pop(sheetContext),
                              ),
                            ],
                          ),
                        ),
                        const Divider(height: 1),
                        Flexible(
                          child: state.items.isEmpty
                              ? const Padding(
                                  padding: EdgeInsets.all(32),
                                  child: Text('Belum ada item'),
                                )
                              : ListView.builder(
                                  shrinkWrap: true,
                                  padding:
                                      const EdgeInsets.symmetric(horizontal: 8),
                                  itemCount: state.items.length,
                                  itemBuilder: (context, index) =>
                                      _buildCartTile(sheetRef, state, index),
                                ),
                        ),
                        const Divider(height: 1),
                        Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              _buildSummaryRow('Subtotal',
                                  CurrencyFormatter.format(state.subtotal)),
                              const SizedBox(height: 4),
                              _buildSummaryRow('Diskon',
                                  CurrencyFormatter.format(state.discount)),
                              const SizedBox(height: 4),
                              _buildSummaryRow(
                                  'Pajak', CurrencyFormatter.format(state.tax)),
                              const Divider(),
                              _buildSummaryRow('Total',
                                  CurrencyFormatter.format(state.total),
                                  bold: true),
                              const SizedBox(height: 12),
                              _buildPaymentSelector(state.paymentMethod),
                              const SizedBox(height: 12),
                              AppButton(
                                label:
                                    'Bayar (Rp ${CurrencyFormatter.formatWithoutSymbol(state.total)})',
                                loading: state.isLoading,
                                onPressed: state.items.isEmpty
                                    ? null
                                    : () {
                                        Navigator.pop(sheetContext);
                                        _showPaymentDialog(state);
                                      },
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              );
            },
          ),
        );
      },
    );
  }

  // ================= LANDSCAPE =================

  Widget _buildLandscape(KasirState kasirState, List<Product> products) {
    return Column(
      children: [
        Expanded(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Expanded(
                flex: 3,
                child: Column(
                  children: [
                    _buildSearchBar(),
                    Expanded(
                      child: _buildProductList(products, compact: false),
                    ),
                  ],
                ),
              ),
              VerticalDivider(width: 1, color: Theme.of(context).dividerColor),
              Expanded(
                flex: 2,
                child: _buildCartPanelLandscape(kasirState),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildCartPanelLandscape(KasirState kasirState) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
          child: Row(
            children: [
              const Icon(Icons.shopping_cart_outlined, size: 20),
              const SizedBox(width: 8),
              Text('Keranjang (${kasirState.items.length})',
                  style: Theme.of(context)
                      .textTheme
                      .titleMedium
                      ?.copyWith(fontWeight: FontWeight.bold)),
            ],
          ),
        ),
        Expanded(
          child: kasirState.items.isEmpty
              ? const Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.shopping_cart_outlined,
                          size: 48, color: Colors.grey),
                      SizedBox(height: 8),
                      Text('Belum ada item'),
                    ],
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 8),
                  itemCount: kasirState.items.length,
                  itemBuilder: (context, index) =>
                      _buildCartTile(ref, kasirState, index),
                ),
        ),
        const Divider(height: 1),
        Flexible(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              mainAxisSize: MainAxisSize.min,
              children: [
                _buildSummaryRow('Subtotal',
                    CurrencyFormatter.format(kasirState.subtotal)),
                const SizedBox(height: 4),
                _buildSummaryRow(
                    'Diskon', CurrencyFormatter.format(kasirState.discount)),
                const SizedBox(height: 4),
                _buildSummaryRow(
                    'Pajak', CurrencyFormatter.format(kasirState.tax)),
                const Divider(),
                _buildSummaryRow('Total',
                    CurrencyFormatter.format(kasirState.total),
                    bold: true),
                const SizedBox(height: 10),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: _buildPaymentChips(kasirState.paymentMethod),
                ),
                const SizedBox(height: 10),
                AppButton(
                  label:
                      'Bayar (Rp ${CurrencyFormatter.formatWithoutSymbol(kasirState.total)})',
                  loading: kasirState.isLoading,
                  onPressed: kasirState.items.isEmpty
                      ? null
                      : () => _showPaymentDialog(kasirState),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  // ================= KOMPONEN BERSAMA =================


  // ================= SCAN -> AUTO MASUK KERANJANG =================

  /// Buka scanner kamera (Android/iOS) / input manual (desktop).
  /// Barcode yang cocok dengan produk langsung ditambahkan ke keranjang.
  Future<void> _scanAndAddToCart() async {
    final code = await showBarcodeScannerSheet(context);
    if (code == null || code.trim().isEmpty || !mounted) return;

    final notifier = ref.read(kasirStateProvider.notifier);
    final product = await notifier.scanBarcode(code.trim());
    if (!mounted) return;

    if (product != null) {
      SystemSound.play(SystemSoundType.alert);
      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(
          SnackBar(
            content: Text('${product.name} masuk keranjang'),
            duration: const Duration(milliseconds: 1200),
          ),
        );
    } else {
      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(
          SnackBar(
            content:
                Text('Produk dengan barcode "${code.trim()}" tidak ditemukan'),
            backgroundColor: Colors.orange,
          ),
        );
    }
    setState(() {});
  }

  // ================= SIMPAN KERANJANG =================

  Future<void> _showSaveCartDialog() async {
    final controller = TextEditingController();
    final notifier = ref.read(kasirStateProvider.notifier);
    final name = await showDialog<String>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Simpan Keranjang'),
        content: TextField(
          controller: controller,
          autofocus: true,
          decoration: const InputDecoration(
            labelText: 'Nama (mis. nama pelanggan)',
            hintText: 'Keranjang 1',
          ),
          onSubmitted: (v) => Navigator.pop(dialogContext, v),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Batal'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(dialogContext, controller.text),
            child: const Text('Simpan'),
          ),
        ],
      ),
    );
    if (name != null && mounted) {
      await notifier.saveCurrentCart(name);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Keranjang "$name" disimpan')),
        );
        setState(() {});
      }
    }
  }

  Future<void> _showSavedCartsSheet() async {
    await showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (sheetContext) {
        return Consumer(
          builder: (context, sheetRef, _) {
            final notifier = sheetRef.read(kasirStateProvider.notifier);
            final carts = notifier.getSavedCarts();
            return SafeArea(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: Row(
                      children: [
                        Text('Keranjang Tersimpan',
                            style: Theme.of(sheetContext)
                                .textTheme
                                .titleMedium
                                ?.copyWith(fontWeight: FontWeight.bold)),
                        const Spacer(),
                        IconButton(
                          icon: const Icon(Icons.close),
                          onPressed: () => Navigator.pop(sheetContext),
                        ),
                      ],
                    ),
                  ),
                  const Divider(height: 1),
                  if (carts.isEmpty)
                    const Padding(
                      padding: EdgeInsets.all(32),
                      child: Text('Belum ada keranjang tersimpan'),
                    )
                  else
                    Flexible(
                      child: ListView.builder(
                        shrinkWrap: true,
                        itemCount: carts.length,
                        itemBuilder: (context, index) {
                          final cart = carts[index];
                          return ListTile(
                            leading: const Icon(Icons.bookmarks_outlined),
                            title: Text(cart.name),
                            subtitle: Text(
                              '${cart.items.length} item • ${CurrencyFormatter.format(cart.total)}',
                              style: Theme.of(sheetContext).textTheme.bodySmall,
                            ),
                            trailing: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                IconButton(
                                  tooltip: 'Hapus',
                                  icon: const Icon(Icons.delete_outline,
                                      color: Colors.red),
                                  onPressed: () async {
                                    await notifier.deleteSavedCart(cart.id);
                                    (sheetContext as Element).markNeedsBuild();
                                  },
                                ),
                                FilledButton(
                                  onPressed: () async {
                                    await notifier.loadSavedCart(cart);
                                    if (sheetContext.mounted) {
                                      Navigator.pop(sheetContext);
                                    }
                                    if (mounted) setState(() {});
                                  },
                                  child: const Text('Pakai'),
                                ),
                              ],
                            ),
                          );
                        },
                      ),
                    ),
                ],
              ),
            );
          },
        );
      },
    );
    if (mounted) setState(() {});
  }

  Widget _buildSearchBar() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 12, 12, 8),
      child: TextField(
        controller: _searchController,
        decoration: InputDecoration(
          hintText: 'Cari nama / SKU / barcode...',
          isDense: true,
          prefixIcon: const Icon(Icons.search),
          suffixIcon: _searchController.text.isNotEmpty
              ? IconButton(
                  icon: const Icon(Icons.clear),
                  onPressed: () {
                    _searchController.clear();
                    setState(() => _query = '');
                  },
                )
              : null,
        ),
        onChanged: (v) => setState(() => _query = v),
      ),
    );
  }

  Widget _buildProductList(List<Product> products, {required bool compact}) {
    if (products.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.inventory_2_outlined,
                size: 48, color: Colors.grey),
            const SizedBox(height: 8),
            Text(
              _query.isEmpty
                  ? 'Belum ada produk.\nTambahkan lewat menu Produk.'
                  : 'Produk tidak ditemukan.',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ],
        ),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(12, 4, 12, 12),
      itemCount: products.length,
      separatorBuilder: (_, __) => const SizedBox(height: 6),
      itemBuilder: (context, index) {
        final product = products[index];
        return _ProductTile(
          product: product,
          compact: compact,
          onAdd: () {
            ref.read(kasirStateProvider.notifier).addProduct(product);
            ScaffoldMessenger.of(context).hideCurrentSnackBar();
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('${product.name} ditambahkan'),
                duration: const Duration(milliseconds: 800),
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildCartTile(WidgetRef sheetRef, KasirState state, int index) {
    final item = state.items[index];
    final product = ref.read(kasirStateProvider.notifier).cachedProduct(item.productId);
    final isWholesale = product != null &&
        product.wholesalePrice > 0 &&
        item.price <= product.wholesalePrice &&
        item.price < product.sellingPrice;

    return ListTile(
      dense: true,
      leading: ProductImageThumb(url: product?.imageUrl, size: 40),
      title: Text(
        item.name.isEmpty ? 'Produk' : item.name,
        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
      ),
      subtitle: Row(
        children: [
          Text(
            '${CurrencyFormatter.format(item.price)} x ${item.qty}',
            style: const TextStyle(fontSize: 11),
          ),
          if (isWholesale) ...[
            const SizedBox(width: 6),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
              decoration: BoxDecoration(
                color: Colors.blue.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(4),
              ),
              child: const Text(
                'Grosir',
                style: TextStyle(fontSize: 9, color: Colors.blue),
              ),
            ),
          ],
        ],
      ),
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          IconButton(
            visualDensity: VisualDensity.compact,
            icon: const Icon(Icons.remove_circle_outline, size: 20),
            onPressed: () => sheetRef
                .read(kasirStateProvider.notifier)
                .decrementQuantity(index),
          ),
          Text(
            item.qty % 1 == 0 ? item.qty.toInt().toString() : item.qty.toString(),
            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
          ),
          IconButton(
            visualDensity: VisualDensity.compact,
            icon: const Icon(Icons.add_circle_outline, size: 20),
            onPressed: () => sheetRef
                .read(kasirStateProvider.notifier)
                .incrementQuantity(index),
          ),
          const SizedBox(width: 4),
          SizedBox(
            width: 76,
            child: Text(
              CurrencyFormatter.format(item.lineTotal),
              textAlign: TextAlign.end,
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryRow(String label, String value, {bool bold = false}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label,
            style: TextStyle(
                fontSize: 13,
                fontWeight: bold ? FontWeight.bold : FontWeight.normal)),
        Text(value,
            style: TextStyle(
                fontWeight: bold ? FontWeight.bold : FontWeight.normal,
                fontSize: bold ? 16 : 13)),
      ],
    );
  }

  List<Widget> _buildPaymentChips(String currentMethod) {
    return [
      _PaymentChip(
        label: 'Tunai',
        icon: Icons.money,
        selected: currentMethod == 'cash',
        onSelected: () =>
            ref.read(kasirStateProvider.notifier).setPaymentMethod('cash'),
      ),
      _PaymentChip(
        label: 'QRIS',
        icon: Icons.qr_code,
        selected: currentMethod == 'qris',
        onSelected: () =>
            ref.read(kasirStateProvider.notifier).setPaymentMethod('qris'),
      ),
      _PaymentChip(
        label: 'Transfer',
        icon: Icons.account_balance,
        selected: currentMethod == 'transfer',
        onSelected: () =>
            ref.read(kasirStateProvider.notifier).setPaymentMethod('transfer'),
      ),
    ];
  }

  Widget _buildPaymentSelector(String currentMethod) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: _buildPaymentChips(currentMethod),
    );
  }

  void _showPaymentDialog(KasirState state) {
    final paidController = TextEditingController();
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Pembayaran'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('Total: ${CurrencyFormatter.format(state.total)}',
                style:
                    const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            TextField(
              controller: paidController,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(
                labelText: 'Jumlah Dibayar',
                prefixText: 'Rp ',
              ),
              onChanged: (v) {
                final amount = double.tryParse(v.replaceAll('.', '')) ?? 0;
                ref.read(kasirStateProvider.notifier).setPaidAmount(amount);
              },
            ),
            if (state.paidAmount > 0) ...[
              const SizedBox(height: 8),
              Text(
                'Kembali: ${CurrencyFormatter.format(state.changeAmount)}',
                style: TextStyle(
                  color: state.changeAmount >= 0 ? Colors.green : Colors.red,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ],
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Batal')),
          FilledButton(
            onPressed: () {
              Navigator.pop(context);
              _processPayment(state);
            },
            child: const Text('Bayar'),
          ),
        ],
      ),
    );
  }

  Future<void> _processPayment(KasirState state) async {
    final notifier = ref.read(kasirStateProvider.notifier);
    final config = await notifier.getReceiptConfig();
    final sale = await notifier.checkout('');
    if (!mounted) return;
    setState(() {});
    if (sale != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Pembayaran berhasil!')),
      );
      await showReceiptPreview(context, sale, config);
    }
  }
}

class _ProductTile extends StatelessWidget {
  final Product product;
  final bool compact;
  final VoidCallback onAdd;

  const _ProductTile({
    required this.product,
    required this.compact,
    required this.onAdd,
  });

  @override
  Widget build(BuildContext context) {
    final hasWholesale =
        product.wholesalePrice > 0 && product.wholesaleMinQty > 0;

    return Card(
      margin: EdgeInsets.zero,
      child: ListTile(
        dense: compact,
        leading: ProductImageThumb(url: product.imageUrl, size: 48),
        title: Text(
          product.name,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '${product.sku} • Stok: ${product.stock % 1 == 0 ? product.stock.toInt() : product.stock} ${product.unit}',
              style: Theme.of(context).textTheme.bodySmall,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            if (hasWholesale)
              Text(
                'Grosir: ${CurrencyFormatter.format(product.wholesalePrice)} (min ${product.wholesaleMinQty % 1 == 0 ? product.wholesaleMinQty.toInt() : product.wholesaleMinQty})',
                style: Theme.of(context)
                    .textTheme
                    .bodySmall
                    ?.copyWith(color: Colors.blue),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
          ],
        ),
        isThreeLine: hasWholesale,
        trailing: IconButton(
          icon: Icon(
            Icons.add_circle_outline,
            color: Theme.of(context).colorScheme.primary,
          ),
          onPressed: onAdd,
        ),
      ),
    );
  }
}



class _PaymentChip extends StatelessWidget {
  final String label;
  final IconData icon;
  final bool selected;
  final VoidCallback onSelected;

  const _PaymentChip({
    required this.label,
    required this.icon,
    required this.selected,
    required this.onSelected,
  });

  @override
  Widget build(BuildContext context) {
    return FilterChip(
      label: Text(label, style: const TextStyle(fontSize: 11)),
      avatar: Icon(icon, size: 16),
      selected: selected,
      onSelected: (_) => onSelected(),
    );
  }
}

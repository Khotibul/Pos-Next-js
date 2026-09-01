import 'dart:async';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../providers/kasir/kasir_provider.dart';
import '../../providers/kasir/kasir_state.dart';
import '../../providers/product/product_provider.dart';
import '../../providers/shift/shift_provider.dart';
import '../../providers/auth/auth_provider.dart';
import '../../../data/repositories/cashier_shift_repository_impl.dart';
import '../../../core/widgets/receipt_preview.dart';
import '../../../core/utils/currency_formatter.dart';
import '../../../core/utils/date_formatter.dart';
import '../../../core/widgets/barcode_scanner_sheet.dart';
import '../../../core/widgets/product_image.dart';
import '../../../domain/entities/product.dart';
import '../../../domain/entities/cashier_shift.dart';

class KasirScreen extends ConsumerStatefulWidget {
  const KasirScreen({super.key});

  @override
  ConsumerState<KasirScreen> createState() => _KasirScreenState();
}

class _KasirScreenState extends ConsumerState<KasirScreen> {
  final _searchController = TextEditingController();
  final _scannerFocus = FocusNode(debugLabel: 'hardware-scanner');
  final _hwBuffer = StringBuffer();
  DateTime _lastKeyTime = DateTime.fromMillisecondsSinceEpoch(0);
  Timer? _hwSilenceTimer;
  String _query = '';

  @override
  void dispose() {
    _hwSilenceTimer?.cancel();
    _scannerFocus.dispose();
    _searchController.dispose();
    super.dispose();
  }

  /// Auto-detect alat scanner barcode fisik (pistol scanner).
  /// Scanner fisik bekerja seperti keyboard: mengetik karakter barcode
  /// dengan sangat cepat lalu mengirim Enter. Input ditangkap global
  /// tanpa perlu mengklik kolom apa pun.
  KeyEventResult _handleHardwareKey(FocusNode node, KeyEvent event) {
    if (event is! KeyDownEvent) return KeyEventResult.ignored;

    final primary = FocusManager.instance.primaryFocus;
    if (primary != null && primary.context?.widget is EditableText) {
      return KeyEventResult.ignored;
    }

    final now = DateTime.now();
    if (now.difference(_lastKeyTime).inMilliseconds > 120) {
      _hwBuffer.clear();
    }
    _lastKeyTime = now;

    if (event.logicalKey == LogicalKeyboardKey.enter ||
        event.logicalKey == LogicalKeyboardKey.numpadEnter) {
      final code = _hwBuffer.toString().trim();
      _hwBuffer.clear();
      if (code.length >= 4) {
        _processScannedCode(code);
      }
      return KeyEventResult.handled;
    }

    final char = event.character;
    if (char != null && char.isNotEmpty && char.codeUnitAt(0) >= 32) {
      _hwBuffer.write(char);
      _hwSilenceTimer?.cancel();
      _hwSilenceTimer = Timer(const Duration(milliseconds: 140), () {
        final buffered = _hwBuffer.toString().trim();
        _hwBuffer.clear();
        if (buffered.length >= 6) {
          _processScannedCode(buffered);
        }
      });
      return KeyEventResult.handled;
    }
    return KeyEventResult.ignored;
  }

  @override
  Widget build(BuildContext context) {
    final kasirState = ref.watch(kasirStateProvider);
    final productsAsync = ref.watch(productListProvider);

    final userId = ref.watch(authStateProvider).maybeWhen(
          authenticated: (user) => user.id,
          orElse: () => '',
        );
    final activeShiftAsync = userId.isEmpty
        ? const AsyncValue<CashierShift?>.data(null)
        : ref.watch(activeShiftProvider(userId));
    final activeShift = activeShiftAsync.valueOrNull;
    final shiftLoading =
        activeShiftAsync.isLoading && activeShiftAsync.valueOrNull == null;

    final products = (productsAsync.valueOrNull ?? const <Product>[])
        .where((p) =>
            _query.isEmpty ||
            p.name.toLowerCase().contains(_query.toLowerCase()) ||
            p.sku.toLowerCase().contains(_query.toLowerCase()) ||
            (p.barcode ?? '').contains(_query))
        .toList();

    return Focus(
      focusNode: _scannerFocus,
      autofocus: true,
      onKeyEvent: _handleHardwareKey,
      child: GestureDetector(
        onTap: () => _scannerFocus.requestFocus(),
        child: Scaffold(
          appBar: AppBar(
            title: const Text('Kasir'),
            automaticallyImplyLeading: false,
            actions: [
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
              const SizedBox(width: 4),
            ],
          ),
          body: _buildShiftGate(context, userId, activeShift, shiftLoading,
              kasirState, products, (constraints) {
            final width = constraints.maxWidth;
            final height = constraints.maxHeight;
            final compactHeight = height < 500;
            // Dua panel hanya dipakai bila masing-masing panel tetap lapang.
            // Tinggi dapat turun saat keyboard terbuka, jadi jangan gunakan
            // tinggi pendek sebagai pemicu layout horizontal.
            final isSplit = width >= 720 && !compactHeight;
            final cartWidth = (width * 0.42).clamp(300.0, 420.0).toDouble();
            final catalogWidth = isSplit ? width - cartWidth - 1 : width;
            final cardTargetWidth = compactHeight ? 150.0 : 180.0;
            final crossAxisCount =
                (catalogWidth / cardTargetWidth).floor().clamp(2, 6).toInt();

            final catalog = _CatalogPanel(
              products: products,
              query: _query,
              onQueryChanged: (v) => setState(() => _query = v),
              onScan: _scanAndAddToCart,
              onAdd: (p) => _addToCart(p),
              crossAxisCount: crossAxisCount,
              compactHeight: compactHeight,
            );

            if (isSplit) {
              return Row(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Expanded(child: catalog),
                  VerticalDivider(
                      width: 1, color: Theme.of(context).dividerColor),
                  SizedBox(
                    width: cartWidth,
                    child: _buildCartSidePanel(kasirState),
                  ),
                ],
              );
            }

            return Column(
              children: [
                Expanded(child: catalog),
                _buildFloatingCartBar(context, kasirState),
              ],
            );
          }),
        ),
      ),
    );
  }

  // ================= GERBANG SHIFT (WAJIB BUKA SHIFT) =================

  Widget _buildShiftGate(
    BuildContext context,
    String userId,
    CashierShift? activeShift,
    bool loading,
    KasirState kasirState,
    List<Product> products,
    Widget Function(BoxConstraints) bodyBuilder,
  ) {
    if (loading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (activeShift == null) {
      return _buildNoShiftBlock(context, userId);
    }
    return Column(
      children: [
        _buildShiftBanner(context, activeShift, userId),
        Expanded(
          child: LayoutBuilder(builder: (context, c) => bodyBuilder(c)),
        ),
      ],
    );
  }

  Widget _buildNoShiftBlock(BuildContext context, String userId) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.primaryContainer,
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.lock_clock_outlined,
                size: 48,
                color: Theme.of(context).colorScheme.onPrimaryContainer,
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'Shift belum dibuka',
              style: Theme.of(context)
                  .textTheme
                  .titleLarge
                  ?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(
              'Buka shift terlebih dahulu sebelum mulai transaksi kasir, '
              'seperti pada aplikasi web.',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            const SizedBox(height: 20),
            FilledButton.icon(
              onPressed: () => _openShift(context, userId),
              icon: const Icon(Icons.play_arrow),
              label: const Text('Buka Shift'),
              style: FilledButton.styleFrom(
                padding:
                    const EdgeInsets.symmetric(horizontal: 28, vertical: 14),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildShiftBanner(
      BuildContext context, CashierShift shift, String userId) {
    final readable = DateFormatter.formatTime(shift.openedAt);
    return Material(
      color: Theme.of(context).colorScheme.primaryContainer,
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          child: Row(
            children: [
              Icon(
                Icons.shield_outlined,
                size: 18,
                color: Theme.of(context).colorScheme.onPrimaryContainer,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Shift aktif sejak $readable',
                  style: TextStyle(
                    fontSize: 12.5,
                    color:
                        Theme.of(context).colorScheme.onPrimaryContainer,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              TextButton.icon(
                onPressed: () => _closeShift(context, shift, userId),
                style: TextButton.styleFrom(
                  foregroundColor:
                      Theme.of(context).colorScheme.onPrimaryContainer,
                  visualDensity: VisualDensity.compact,
                ),
                icon: const Icon(Icons.lock_outline, size: 16),
                label: const Text('Tutup Shift'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ================= BAR KERANJANG MENGAMBANG (POTRET) =================

  Widget _buildFloatingCartBar(BuildContext context, KasirState state) {
    final itemCount = state.items.length;
    return SafeArea(
      top: false,
      child: Container(
        margin: const EdgeInsets.fromLTRB(12, 6, 12, 12),
        padding: const EdgeInsets.fromLTRB(14, 10, 14, 10),
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surface,
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.10),
              blurRadius: 18,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          children: [
            Stack(
              clipBehavior: Clip.none,
              children: [
                IconButton.filledTonal(
                  style: IconButton.styleFrom(
                    backgroundColor:
                        Theme.of(context).colorScheme.primaryContainer,
                  ),
                  onPressed: () => _openCartSheet(state),
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
                    itemCount > 0 ? '$itemCount item dikeranjang' : 'Keranjang kosong',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                  FittedBox(
                    fit: BoxFit.scaleDown,
                    child: Text(
                      CurrencyFormatter.format(state.total),
                      style: Theme.of(context)
                          .textTheme
                          .titleMedium
                          ?.copyWith(fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            _GradientPayButton(
              label: 'Bayar',
              total: state.total,
              loading: state.isLoading,
              enabled: itemCount > 0,
              expanded: false,
              onPressed: () => _openCartSheet(state),
            ),
          ],
        ),
      ),
    );
  }

  // ================= SHEET KERANJANG (POTRET) =================

  void _openCartSheet(KasirState kasirState) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (sheetContext) {
        return PopScope(
          onPopInvokedWithResult: (didPop, _) {
            if (!didPop && mounted) setState(() {});
          },
          child: Consumer(
            builder: (context, sheetRef, _) {
              final state = sheetRef.watch(kasirStateProvider);
              return Padding(
                padding: EdgeInsets.only(
                  bottom: MediaQuery.of(sheetContext).viewInsets.bottom,
                ),
                child: ConstrainedBox(
                  constraints: BoxConstraints(
                    maxHeight:
                        MediaQuery.of(sheetContext).size.height * 0.82,
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const SizedBox(height: 10),
                      Container(
                        width: 40,
                        height: 4,
                        decoration: BoxDecoration(
                          color: Theme.of(sheetContext).dividerColor,
                          borderRadius: BorderRadius.circular(4),
                        ),
                      ),
                      Padding(
                        padding: const EdgeInsets.fromLTRB(20, 12, 12, 10),
                        child: Row(
                          children: [
                            Text(
                              'Keranjang (${state.items.length})',
                              style: Theme.of(sheetContext)
                                  .textTheme
                                  .titleMedium
                                  ?.copyWith(fontWeight: FontWeight.bold),
                            ),
                            const Spacer(),
                            if (state.items.isNotEmpty)
                              TextButton.icon(
                                onPressed: () {
                                  for (var i = state.items.length - 1;
                                      i >= 0;
                                      i--) {
                                    sheetRef
                                        .read(kasirStateProvider.notifier)
                                        .removeItem(i);
                                  }
                                },
                                icon: const Icon(Icons.delete_sweep_outlined,
                                    size: 18, color: Colors.red),
                                label: const Text('Kosongkan',
                                    style: TextStyle(color: Colors.red)),
                              )
                            else
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
                            ? Padding(
                                padding: const EdgeInsets.all(40),
                                child: Column(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(Icons.shopping_cart_outlined,
                                        size: 52,
                                        color: Theme.of(sheetContext)
                                            .disabledColor),
                                    const SizedBox(height: 12),
                                    const Text(
                                        'Belum ada item.\nPilih produk dari katalog.'),
                                  ],
                                ),
                              )
                            : ListView.separated(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 12, vertical: 8),
                                itemCount: state.items.length,
                                separatorBuilder: (_, __) =>
                                    const SizedBox(height: 6),
                                itemBuilder: (context, index) =>
                                    _CartTile(sheetRef, state, index),
                              ),
                      ),
                      if (state.items.isNotEmpty) ...[
                        const Divider(height: 1),
                        _CartFooter(state: state, compact: false),
                      ],
                    ],
                  ),
                ),
              );
            },
          ),
        );
      },
    );
  }

  // ================= PANEL KERANJANG (LANSKAP) =================

  Widget _buildCartSidePanel(KasirState state) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 14, 8, 10),
          child: Row(
            children: [
              Icon(
                Icons.shopping_cart_outlined,
                size: 20,
                color: Theme.of(context).colorScheme.primary,
              ),
              const SizedBox(width: 8),
              Text(
                'Keranjang (${state.items.length})',
                style: Theme.of(context)
                    .textTheme
                    .titleMedium
                    ?.copyWith(fontWeight: FontWeight.bold),
              ),
              const Spacer(),
              if (state.items.isNotEmpty)
                IconButton(
                  tooltip: 'Kosongkan',
                  icon: const Icon(Icons.delete_sweep_outlined,
                      size: 20, color: Colors.red),
                  onPressed: () {
                    for (var i = state.items.length - 1; i >= 0; i--) {
                      ref.read(kasirStateProvider.notifier).removeItem(i);
                    }
                  },
                ),
            ],
          ),
        ),
        Expanded(
          child: state.items.isEmpty
              ? Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.shopping_cart_outlined,
                          size: 52, color: Theme.of(context).disabledColor),
                      const SizedBox(height: 12),
                      const Text('Belum ada item.\nPilih produk dari katalog.',
                          textAlign: TextAlign.center),
                    ],
                  ),
                )
              : ListView.separated(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  itemCount: state.items.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 6),
                  itemBuilder: (context, index) =>
                      _CartTile(ref, state, index),
                ),
        ),
        if (state.items.isNotEmpty) ...[
          const Divider(height: 1),
          _CartFooter(state: state, compact: true),
        ],
      ],
    );
  }

  // ================= AKSI =================

  void _addToCart(Product product) {
    ref.read(kasirStateProvider.notifier).addProduct(product);
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text('${product.name} masuk keranjang'),
          duration: const Duration(milliseconds: 800),
        ),
      );
  }

  // ================= SCAN -> AUTO MASUK KERANJANG =================

  /// Proses kode hasil scan (kamera / alat scanner fisik):
  /// cari produk -> langsung masuk keranjang + beep + feedback.
  Future<void> _processScannedCode(String code) async {
    final trimmed = code.trim();
    if (trimmed.isEmpty || !mounted) return;

    final notifier = ref.read(kasirStateProvider.notifier);
    final product = await notifier.scanBarcode(trimmed);
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
                Text('Produk dengan barcode "$trimmed" tidak ditemukan'),
            backgroundColor: Colors.orange,
          ),
        );
    }
    setState(() {});
  }

  /// Kamera perangkat sebagai scanner utama.
  /// Di desktop (tanpa kamera): alat scanner fisik terdeteksi otomatis
  /// lewat listener global, tanpa perlu klik apa pun.
  Future<void> _scanAndAddToCart() async {
    if (Platform.isAndroid || Platform.isIOS) {
      final code = await showBarcodeScannerSheet(context);
      if (code == null || code.trim().isEmpty || !mounted) return;
      await _processScannedCode(code);
    } else {
      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(
          const SnackBar(
            content: Text(
              'Kamera tidak tersedia. Arahkan alat scanner fisik ke barcode — '
              'deteksinya otomatis tanpa perlu klik apa pun.',
            ),
            duration: Duration(seconds: 3),
          ),
        );
    }
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

  // ================= BUKA / TUTUP SHIFT =================

  Future<void> _openShift(BuildContext context, String userId) async {
    if (userId.isEmpty) return;
    final openingCashController = TextEditingController();
    final noteController = TextEditingController();

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => PopScope(
        canPop: false,
        child: AlertDialog(
          title: const Text('Buka Shift'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Set modal awal (opening cash) sebelum mulai transaksi kasir.',
              ),
              const SizedBox(height: 16),
              TextField(
                controller: openingCashController,
                keyboardType: TextInputType.number,
                autofocus: true,
                decoration: const InputDecoration(
                  labelText: 'Saldo Awal',
                  prefixText: 'Rp ',
                  hintText: '0',
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: noteController,
                decoration: const InputDecoration(
                  labelText: 'Catatan (opsional)',
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogContext, false),
              child: const Text('Batal'),
            ),
            FilledButton.icon(
              onPressed: () => Navigator.pop(dialogContext, true),
              icon: const Icon(Icons.play_arrow),
              label: const Text('Buka Shift'),
            ),
          ],
        ),
      ),
    );

    if (confirmed != true || !mounted) {
      openingCashController.dispose();
      noteController.dispose();
      return;
    }

    final rawOpening = openingCashController.text;
    final rawOpenNote = noteController.text;
    openingCashController.dispose();
    noteController.dispose();

    final openingCash = double.tryParse(rawOpening.replaceAll('.', '')) ?? 0;
    final ok = await ref.read(shiftControllerProvider.notifier).open(
          userId,
          openingCash: openingCash,
          openNote: rawOpenNote.trim().isEmpty ? null : rawOpenNote.trim(),
        );
    if (!context.mounted) return;
    final messenger = ScaffoldMessenger.maybeOf(context);
    messenger?.showSnackBar(
      SnackBar(
        content: Text(ok ? 'Shift berhasil dibuka' : 'Gagal membuka shift'),
      ),
    );
  }

  Future<void> _closeShift(
      BuildContext context, CashierShift shift, String userId) async {
    if (userId.isEmpty) return;
    final container = ProviderScope.containerOf(context);
    final repo = container.read(cashierShiftRepositoryProvider);
    final summaryResult = await repo.computeShiftSummary(shift);
    final summary = summaryResult.fold((_) => shift, (s) => s);

    if (!context.mounted) return;
    final cashCountedController = TextEditingController();
    final noteController = TextEditingController();

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => PopScope(
        canPop: false,
        child: AlertDialog(
          title: const Text('Tutup Shift'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _summaryRow(dialogContext, 'Total penjualan',
                    CurrencyFormatter.format(summary.totalSales),
                    bold: true),
                _summaryRow(dialogContext, 'Jumlah transaksi',
                    '${summary.transactionCount}'),
                const Divider(),
                _summaryRow(dialogContext, 'Kas',
                    CurrencyFormatter.format(summary.totalCash)),
                _summaryRow(dialogContext, 'QRIS',
                    CurrencyFormatter.format(summary.totalQris)),
                _summaryRow(dialogContext, 'Transfer',
                    CurrencyFormatter.format(summary.totalTransfer)),
                _summaryRow(dialogContext, 'E-wallet',
                    CurrencyFormatter.format(summary.totalEwallet)),
                _summaryRow(dialogContext, 'Pengeluaran',
                    CurrencyFormatter.format(summary.totalExpenses)),
                _summaryRow(dialogContext, 'Saldo awal',
                    CurrencyFormatter.format(shift.openingCash)),
                _summaryRow(dialogContext, 'Kas sistem',
                    CurrencyFormatter.format(summary.cashSystem),
                    bold: true),
                const Divider(),
                const SizedBox(height: 8),
                const Text('Masukkan uang aktual (cash counted) untuk menutup shift.',
                    style: TextStyle(fontSize: 12)),
                const SizedBox(height: 12),
                TextField(
                  controller: cashCountedController,
                  keyboardType: TextInputType.number,
                  autofocus: true,
                  decoration: InputDecoration(
                    labelText: 'Cash Counted',
                    prefixText: 'Rp ',
                    hintText:
                        summary.cashSystem.toStringAsFixed(0),
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: noteController,
                  decoration: const InputDecoration(
                    labelText: 'Catatan (opsional)',
                  ),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogContext, false),
              child: const Text('Batal'),
            ),
            FilledButton.icon(
              onPressed: () => Navigator.pop(dialogContext, true),
              icon: const Icon(Icons.lock_outline),
              label: const Text('Tutup Shift'),
            ),
          ],
        ),
      ),
    );

    if (confirmed != true || !mounted) {
      cashCountedController.dispose();
      noteController.dispose();
      return;
    }

    final rawCounted = cashCountedController.text;
    final rawCloseNote = noteController.text;
    cashCountedController.dispose();
    noteController.dispose();

    final cashCounted =
        double.tryParse(rawCounted.replaceAll('.', '')) ?? summary.cashSystem;
    final ok = await ref
        .read(shiftControllerProvider.notifier)
        .close(
          shiftId: shift.id,
          cashierId: userId,
          cashCounted: cashCounted,
          closeNote:
              rawCloseNote.trim().isEmpty ? null : rawCloseNote.trim(),
        );
    if (!context.mounted) return;
    final messenger = ScaffoldMessenger.maybeOf(context);
    messenger?.showSnackBar(
      SnackBar(
        content: Text(ok ? 'Shift ditutup' : 'Gagal menutup shift'),
      ),
    );
  }

  Widget _summaryRow(BuildContext context, String label, String value,
      {bool bold = false}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label,
            style: TextStyle(
                fontSize: bold ? 14 : 12.5,
                fontWeight: bold ? FontWeight.bold : FontWeight.normal)),
        Text(value,
            style: TextStyle(
                fontSize: bold ? 16 : 12.5,
                fontWeight: bold ? FontWeight.bold : FontWeight.normal)),
      ],
    );
  }

}

// ================= KATALOG PRODUK =================

class _CatalogPanel extends StatelessWidget {
  final List<Product> products;
  final String query;
  final ValueChanged<String> onQueryChanged;
  final VoidCallback onScan;
  final ValueChanged<Product> onAdd;
  final int crossAxisCount;
  final bool compactHeight;

  const _CatalogPanel({
    required this.products,
    required this.query,
    required this.onQueryChanged,
    required this.onScan,
    required this.onAdd,
    required this.crossAxisCount,
    required this.compactHeight,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(12, 12, 12, 8),
          child: TextField(
            onChanged: onQueryChanged,
            decoration: InputDecoration(
              hintText: 'Cari nama, SKU, atau barcode...',
              filled: true,
              prefixIcon: const Icon(Icons.search),
              suffixIcon: IconButton(
                tooltip: 'Scan Barcode',
                icon: Icon(
                  Icons.qr_code_scanner,
                  color: Theme.of(context).colorScheme.primary,
                ),
                onPressed: onScan,
              ),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(16),
                borderSide: BorderSide.none,
              ),
              contentPadding: const EdgeInsets.symmetric(vertical: 12),
            ),
          ),
        ),
        Expanded(
          child: products.isEmpty
              ? Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.inventory_2_outlined,
                          size: 52, color: Theme.of(context).disabledColor),
                      const SizedBox(height: 12),
                      Text(
                        query.isEmpty
                            ? 'Belum ada produk.\nTambahkan lewat menu Produk.'
                            : 'Produk tidak ditemukan.',
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                )
              : LayoutBuilder(
                  builder: (context, constraints) {
                    return GridView.builder(
                      padding: const EdgeInsets.fromLTRB(12, 4, 12, 12),
                      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: crossAxisCount,
                        mainAxisSpacing: 10,
                        crossAxisSpacing: 10,
                        childAspectRatio: compactHeight ? 0.82 : 0.72,
                      ),
                      itemCount: products.length,
                      itemBuilder: (context, i) => _ProductCard(
                        product: products[i],
                        onAdd: () => onAdd(products[i]),
                      ),
                    );
                  },
                ),
        ),
      ],
    );
  }
}

class _ProductCard extends StatelessWidget {
  final Product product;
  final VoidCallback onAdd;

  const _ProductCard({required this.product, required this.onAdd});

  @override
  Widget build(BuildContext context) {
    final outOfStock = product.stock <= 0;
    final hasWholesale =
        product.wholesalePrice > 0 && product.wholesaleMinQty > 0;
    final theme = Theme.of(context);

    return Opacity(
      opacity: outOfStock ? 0.55 : 1,
      child: Container(
        decoration: BoxDecoration(
          color: theme.colorScheme.surfaceContainerLow,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: theme.dividerColor.withValues(alpha: 0.3),
          ),
        ),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: outOfStock ? null : onAdd,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Stack(
                children: [
                  SizedBox(
                    height: 96,
                    width: double.infinity,
                    child: ProductImageThumb(
                      url: product.imageUrl,
                      size: 96,
                      borderRadius: BorderRadius.zero,
                    ),
                  ),
                  if (outOfStock)
                    Positioned.fill(
                      child: Container(
                        color: Colors.black45,
                        alignment: Alignment.center,
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: Colors.red,
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: const Text(
                            'Habis',
                            style: TextStyle(
                                color: Colors.white,
                                fontSize: 11,
                                fontWeight: FontWeight.bold),
                          ),
                        ),
                      ),
                    )
                  else if (hasWholesale)
                    Positioned(
                      top: 6,
                      left: 6,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 7, vertical: 3),
                        decoration: BoxDecoration(
                          color: Colors.blue,
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: const Text(
                          'Grosir',
                          style: TextStyle(
                              color: Colors.white,
                              fontSize: 9,
                              fontWeight: FontWeight.bold),
                        ),
                      ),
                    ),
                  Positioned(
                    top: 6,
                    right: 6,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 7, vertical: 3),
                      decoration: BoxDecoration(
                        color: Colors.black54,
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        '${product.stock % 1 == 0 ? product.stock.toInt() : product.stock} ${product.unit}',
                        style:
                            const TextStyle(color: Colors.white, fontSize: 9),
                      ),
                    ),
                  ),
                ],
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(10, 8, 10, 10),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      product.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                          fontSize: 13, fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Flexible(
                          child: FittedBox(
                            fit: BoxFit.scaleDown,
                            child: Text(
                              CurrencyFormatter.format(product.sellingPrice),
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.bold,
                                color: theme.colorScheme.primary,
                              ),
                            ),
                          ),
                        ),
                        const Spacer(),
                        Material(
                          color: theme.colorScheme.primary,
                          borderRadius: BorderRadius.circular(10),
                          child: InkWell(
                            onTap: outOfStock ? null : onAdd,
                            borderRadius: BorderRadius.circular(10),
                            child: const Padding(
                              padding: EdgeInsets.all(5),
                              child: Icon(Icons.add,
                                  size: 18, color: Colors.white),
                            ),
                          ),
                        ),
                      ],
                    ),
                    if (hasWholesale) ...[
                      const SizedBox(height: 3),
                      Text(
                        'Grosir: ${CurrencyFormatter.format(product.wholesalePrice)} • min ${product.wholesaleMinQty % 1 == 0 ? product.wholesaleMinQty.toInt() : product.wholesaleMinQty}',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: theme.textTheme.bodySmall
                            ?.copyWith(color: Colors.blue),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ================= ITEM KERANJANG =================

class _CartTile extends StatelessWidget {
  final WidgetRef ref;
  final KasirState state;
  final int index;

  const _CartTile(this.ref, this.state, this.index);

  @override
  Widget build(BuildContext context) {
    final item = state.items[index];
    final notifier = ref.read(kasirStateProvider.notifier);
    final product = notifier.cachedProduct(item.productId);
    final isWholesale = product != null &&
        product.wholesalePrice > 0 &&
        item.price <= product.wholesalePrice &&
        item.price < product.sellingPrice;

    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerLow,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        children: [
          ProductImageThumb(url: product?.imageUrl, size: 44),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.name.isEmpty ? 'Produk' : item.name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                      fontSize: 13, fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 2),
                Row(
                  children: [
                    Text(
                      '${CurrencyFormatter.format(item.price)} x ${item.qty % 1 == 0 ? item.qty.toInt() : item.qty}',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                    if (isWholesale) ...[
                      const SizedBox(width: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 6, vertical: 1),
                        decoration: BoxDecoration(
                          color: Colors.blue.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: const Text('Grosir',
                            style:
                                TextStyle(fontSize: 9, color: Colors.blue)),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
          _QtyStepper(
            qty: item.qty,
            onDecrement: () => notifier.decrementQuantity(index),
            onIncrement: () => notifier.incrementQuantity(index),
          ),
          const SizedBox(width: 8),
          SizedBox(
            width: 78,
            child: Text(
              CurrencyFormatter.format(item.lineTotal),
              textAlign: TextAlign.end,
              style: const TextStyle(
                  fontWeight: FontWeight.bold, fontSize: 12),
            ),
          ),
        ],
      ),
    );
  }
}

class _QtyStepper extends StatelessWidget {
  final double qty;
  final VoidCallback onDecrement;
  final VoidCallback onIncrement;

  const _QtyStepper({
    required this.qty,
    required this.onDecrement,
    required this.onIncrement,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerHighest
            .withValues(alpha: 0.6),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          _stepIcon(context, Icons.remove, onDecrement),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 6),
            child: Text(
              qty % 1 == 0 ? qty.toInt().toString() : qty.toString(),
              style: const TextStyle(
                  fontSize: 13, fontWeight: FontWeight.bold),
            ),
          ),
          _stepIcon(context, Icons.add, onIncrement),
        ],
      ),
    );
  }

  Widget _stepIcon(BuildContext context, IconData icon, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: Padding(
        padding: const EdgeInsets.all(5),
        child: Icon(icon, size: 16, color: Theme.of(context).colorScheme.primary),
      ),
    );
  }
}

// ================= FOOTER RINGKASAN + BAYAR =================

class _CartFooter extends StatelessWidget {
  final KasirState state;
  final bool compact;

  const _CartFooter({required this.state, required this.compact});

  @override
  Widget build(BuildContext context) {
    return Consumer(
      builder: (context, ref, _) {
        final live = ref.watch(kasirStateProvider);
        return Container(
          padding: EdgeInsets.all(compact ? 12 : 16),
          child: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              mainAxisSize: MainAxisSize.min,
              children: [
                _summaryRow(context, 'Subtotal',
                    CurrencyFormatter.format(live.subtotal)),
                const SizedBox(height: 3),
                _summaryRow(context, 'Diskon',
                    CurrencyFormatter.format(live.discount)),
                const SizedBox(height: 3),
                _summaryRow(
                    context, 'Pajak', CurrencyFormatter.format(live.tax)),
                const Divider(height: 14),
                _summaryRow(context, 'Total',
                    CurrencyFormatter.format(live.total),
                    bold: true),
                const SizedBox(height: 12),
                SegmentedButton<String>(
                  segments: const [
                    ButtonSegment(
                        value: 'cash',
                        icon: Icon(Icons.money, size: 16),
                        label: Text('Tunai')),
                    ButtonSegment(
                        value: 'qris',
                        icon: Icon(Icons.qr_code, size: 16),
                        label: Text('QRIS')),
                    ButtonSegment(
                        value: 'transfer',
                        icon: Icon(Icons.account_balance, size: 16),
                        label: Text('Transfer')),
                  ],
                  selected: {live.paymentMethod},
                  onSelectionChanged: (v) => ref
                      .read(kasirStateProvider.notifier)
                      .setPaymentMethod(v.first),
                  style: const ButtonStyle(
                    visualDensity: VisualDensity.compact,
                    textStyle: WidgetStatePropertyAll(TextStyle(fontSize: 11)),
                  ),
                ),
                const SizedBox(height: 12),
                _GradientPayButton(
                  label:
                      'Bayar (Rp ${CurrencyFormatter.formatWithoutSymbol(live.total)})',
                  total: live.total,
                  loading: live.isLoading,
                  enabled: true,
                  expanded: true,
                  onPressed: () {
                    _showPaymentDialog(context, ref, live);
                  },
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Future<void> _showPaymentDialog(
      BuildContext context, WidgetRef ref, KasirState state) async {
    final paidController = TextEditingController();
    final container = ProviderScope.containerOf(context);
    final notifier = container.read(kasirStateProvider.notifier);
    final config = await notifier.getReceiptConfig();
    var paymentCommitted = false;

    void setPaid(double amount) {
      container.read(kasirStateProvider.notifier).setPaidAmount(amount);
      paidController.text =
          amount % 1 == 0 ? amount.toInt().toString() : amount.toString();
    }

    final quickAmounts = <double>[
      10000,
      20000,
      50000,
      100000,
    ];

    final isQris = state.paymentMethod == 'qris';
    final hasQrisImage =
        config.qrisImage != null && config.qrisImage!.isNotEmpty;

    if (!context.mounted) return;

    await showDialog(
      context: context,
      builder: (dialogContext) => PopScope(
        onPopInvokedWithResult: (didPop, _) {
          if (!didPop || paymentCommitted) return;
          container.read(kasirStateProvider.notifier).setPaidAmount(0);
        },
        child: Consumer(
          builder: (dialogContext, dialogRef, _) {
            final live = dialogRef.watch(kasirStateProvider);
            final change = live.paidAmount - live.total;
            final dialogSize = MediaQuery.sizeOf(dialogContext);
            final compactDialog = dialogSize.height < 520;
            final dialogInset = EdgeInsets.symmetric(
              horizontal: compactDialog ? 16 : 40,
              vertical: compactDialog ? 8 : 24,
            );

            // ============ TAMPILAN QRIS ============
            if (isQris) {
              return AlertDialog(
                scrollable: true,
                insetPadding: dialogInset,
                title: const Text('Pembayaran QRIS'),
                content: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text('Total: ${CurrencyFormatter.format(live.total)}',
                        style: const TextStyle(
                            fontSize: 18, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 14),
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: Colors.grey.shade300),
                      ),
                      child: hasQrisImage
                          ? ProductImageThumb(
                              url: config.qrisImage,
                              size: compactDialog ? 120 : 250,
                              borderRadius: BorderRadius.circular(8),
                            )
                          : Column(
                              children: [
                                Icon(Icons.qr_code_2,
                                    size: 80,
                                    color: Theme.of(dialogContext).hintColor),
                                const SizedBox(height: 8),
                                Text(
                                  'Foto QRIS belum diatur.\n'
                                  'Atur di Pengaturan → Printer & Struk → QRIS Merchant.',
                                  textAlign: TextAlign.center,
                                  style: Theme.of(dialogContext)
                                      .textTheme
                                      .bodySmall,
                                ),
                              ],
                            ),
                    ),
                    const SizedBox(height: 8),
                    Center(
                      child: Text(
                        hasQrisImage
                            ? 'Minta pelanggan memindai QRIS merchant'
                            : 'Pelanggan dapat membayar via aplikasi e-wallet',
                        style: Theme.of(dialogContext).textTheme.bodySmall,
                        textAlign: TextAlign.center,
                      ),
                    ),
                  ],
                ),
                actions: [
                  TextButton(
                      onPressed: () => Navigator.pop(dialogContext),
                      child: const Text('Batal')),
                  FilledButton.icon(
                    onPressed: () {
                      if (paymentCommitted) return;
                      paymentCommitted = true;
                      container
                          .read(kasirStateProvider.notifier)
                          .setPaidAmount(live.total);
                      Navigator.pop(dialogContext);
                      _payNow(context, config);
                    },
                    icon: const Icon(Icons.check_circle_outline, size: 18),
                    label: const Text('Pembayaran Diterima'),
                  ),
                ],
              );
            }

            // ============ TUNAI / TRANSFER ============
            return AlertDialog(
              scrollable: true,
              insetPadding: dialogInset,
              title: const Text('Pembayaran'),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text('Total: ${CurrencyFormatter.format(live.total)}',
                      style: const TextStyle(
                          fontSize: 18, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 14),
                  Text('Uang Diterima',
                      style: Theme.of(dialogContext).textTheme.bodySmall),
                  const SizedBox(height: 6),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      ActionChip(
                        avatar: const Icon(Icons.check_circle_outline,
                            size: 16, color: Colors.green),
                        label: const Text('Uang Pas',
                            style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                color: Colors.green)),
                        backgroundColor:
                            Colors.green.withValues(alpha: 0.08),
                        side: BorderSide(
                            color: Colors.green.withValues(alpha: 0.4)),
                        onPressed: () => setPaid(live.total),
                      ),
                      for (final value in quickAmounts)
                        ActionChip(
                          label: Text(
                            CurrencyFormatter.formatWithoutSymbol(value),
                            style: const TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w600),
                          ),
                          onPressed: () => setPaid(value),
                        ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: paidController,
                    keyboardType: TextInputType.number,
                    autofocus: true,
                    decoration: const InputDecoration(
                      labelText: 'Jumlah Dibayar',
                      prefixText: 'Rp ',
                    ),
                    onChanged: (v) {
                      final amount =
                          double.tryParse(v.replaceAll('.', '')) ?? 0;
                      dialogRef
                          .read(kasirStateProvider.notifier)
                          .setPaidAmount(amount);
                    },
                  ),
                  if (live.paidAmount > 0) ...[
                    const SizedBox(height: 10),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: change >= 0
                            ? Colors.green.withValues(alpha: 0.08)
                            : Colors.orange.withValues(alpha: 0.08),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            change >= 0 ? 'Kembalian' : 'Kurang',
                            style: const TextStyle(fontSize: 13),
                          ),
                          Text(
                            CurrencyFormatter.format(change.abs()),
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.bold,
                              color:
                                  change >= 0 ? Colors.green : Colors.orange,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ],
              ),
              actions: [
                TextButton(
                    onPressed: () => Navigator.pop(dialogContext),
                    child: const Text('Batal')),
                FilledButton(
                  onPressed: live.paidAmount >= live.total
                      ? () {
                          if (paymentCommitted) return;
                          paymentCommitted = true;
                          Navigator.pop(dialogContext);
                          _payNow(context, config);
                        }
                      : null,
                  child: const Text('Bayar'),
                ),
              ],
            );
          },
        ),
      ),
    );
  }

  Future<void> _payNow(BuildContext context, ReceiptConfig config) async {
    final container = ProviderScope.containerOf(context);
    final notifier = container.read(kasirStateProvider.notifier);
    final userId = container.read(authStateProvider).maybeWhen(
          authenticated: (u) => u.id,
          orElse: () => '',
        );
    final activeShift = userId.isEmpty
        ? null
        : container.read(activeShiftProvider(userId)).valueOrNull;
    final sale = await notifier.checkout(userId, shiftId: activeShift?.id);
    if (!context.mounted) return;
    final messenger = ScaffoldMessenger.maybeOf(context);
    messenger?.showSnackBar(
      const SnackBar(content: Text('Pembayaran berhasil!')),
    );
    if (sale != null) {
      await showReceiptPreview(context, sale, config);
    }
    container.invalidate(kasirStateProvider);
  }

  Widget _summaryRow(BuildContext context, String label, String value,
      {bool bold = false}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label,
            style: TextStyle(
                fontSize: bold ? 14 : 12.5,
                fontWeight: bold ? FontWeight.bold : FontWeight.normal)),
        Text(value,
            style: TextStyle(
                fontSize: bold ? 16 : 12.5,
                fontWeight: bold ? FontWeight.bold : FontWeight.normal)),
      ],
    );
  }
}

// ================= TOMBOL BAYAR GRADIENT =================

class _GradientPayButton extends StatelessWidget {
  final String label;
  final double total;
  final bool loading;
  final bool enabled;
  final bool expanded;
  final VoidCallback onPressed;

  const _GradientPayButton({
    required this.label,
    required this.total,
    required this.loading,
    required this.enabled,
    required this.expanded,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        gradient: enabled
            ? LinearGradient(
                colors: [
                  Theme.of(context).colorScheme.primary,
                  Theme.of(context).colorScheme.tertiary,
                ],
              )
            : null,
        color: enabled ? null : Theme.of(context).disabledColor,
        borderRadius: BorderRadius.circular(16),
      ),
      child: FilledButton.tonal(
        style: FilledButton.styleFrom(
          backgroundColor: Colors.transparent,
          foregroundColor: Colors.white,
          shadowColor: Colors.transparent,
          padding: EdgeInsets.symmetric(
            horizontal: expanded ? 16 : 22,
            vertical: expanded ? 14 : 12,
          ),
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        ),
        onPressed: enabled && !loading ? onPressed : null,
        child: loading
            ? const SizedBox(
                width: 18,
                height: 18,
                child: CircularProgressIndicator(
                    strokeWidth: 2, color: Colors.white),
              )
            : FittedBox(
                fit: BoxFit.scaleDown,
                child: Text(
                  label,
                  maxLines: 1,
                  style: const TextStyle(
                      fontWeight: FontWeight.bold, fontSize: 13),
                ),
              ),
      ),
    );
  }
}

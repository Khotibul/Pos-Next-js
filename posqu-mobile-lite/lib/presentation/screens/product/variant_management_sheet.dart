import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../data/repositories/product_repository_impl.dart';
import '../../../domain/entities/product.dart';

Future<bool> showVariantManagementSheet(
  BuildContext context, {
  required Product product,
}) async {
  final changed = await showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    builder: (_) => FractionallySizedBox(
      heightFactor: 0.92,
      child: VariantManagementSheet(product: product),
    ),
  );
  return changed ?? false;
}

class VariantManagementSheet extends ConsumerStatefulWidget {
  final Product product;

  const VariantManagementSheet({super.key, required this.product});

  @override
  ConsumerState<VariantManagementSheet> createState() =>
      _VariantManagementSheetState();
}

class _VariantManagementSheetState
    extends ConsumerState<VariantManagementSheet> {
  late List<ProductVariant> _variants = widget.product.variants;
  bool _loading = true;
  bool _busy = false;
  bool _changed = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load({bool showSpinner = false}) async {
    if (showSpinner && mounted) setState(() => _loading = true);
    final result = await ref.read(productRepositoryProvider).getProductVariants(
          widget.product.id,
        );
    if (!mounted) return;
    result.fold(
      (failure) {
        if (_variants.isEmpty) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(failure.message)),
          );
        }
      },
      (variants) => setState(() => _variants = variants),
    );
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _openEditor([ProductVariant? variant]) async {
    final draft = await showDialog<_VariantDraft>(
      context: context,
      builder: (_) => _VariantEditorDialog(
        productName: widget.product.name,
        variant: variant,
      ),
    );
    if (draft == null || !mounted) return;

    setState(() => _busy = true);
    final result =
        await ref.read(productRepositoryProvider).upsertProductVariant(
              widget.product.id,
              variantId: variant?.id,
              name: draft.name,
              sku: draft.sku,
              barcode: draft.barcode,
              qrCode: variant?.qrCode,
              price: draft.price,
              stock: draft.stock,
            );
    if (!mounted) return;
    setState(() => _busy = false);
    result.fold(
      (failure) => ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(failure.message)),
      ),
      (_) async {
        _changed = true;
        await _load();
      },
    );
  }

  Future<void> _deleteVariant(ProductVariant variant) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Hapus Varian'),
        content: Text(
          'Hapus varian "${variant.name}"? Varian yang sudah dipakai transaksi tidak bisa dihapus.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: const Text('Batal'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(dialogContext, true),
            child: const Text('Hapus'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;

    setState(() => _busy = true);
    final result = await ref
        .read(productRepositoryProvider)
        .deleteProductVariant(widget.product.id, variant.id);
    if (!mounted) return;
    setState(() => _busy = false);
    result.fold(
      (failure) => ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(failure.message)),
      ),
      (_) async {
        _changed = true;
        await _load();
      },
    );
  }

  String _money(double value) {
    final digits = value.round().toString();
    final buffer = StringBuffer();
    for (var i = 0; i < digits.length; i++) {
      if (i > 0 && (digits.length - i) % 3 == 0) buffer.write('.');
      buffer.write(digits[i]);
    }
    return 'Rp $buffer';
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 8, 8),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Varian Produk',
                        style: theme.textTheme.titleMedium
                            ?.copyWith(fontWeight: FontWeight.bold)),
                    Text(
                      widget.product.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.bodySmall,
                    ),
                  ],
                ),
              ),
              IconButton(
                tooltip: 'Tutup',
                onPressed:
                    _busy ? null : () => Navigator.pop(context, _changed),
                icon: const Icon(Icons.close),
              ),
            ],
          ),
        ),
        const Divider(height: 1),
        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator())
              : _variants.isEmpty
                  ? Center(
                      child: Padding(
                        padding: const EdgeInsets.all(24),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.layers_outlined,
                                size: 48, color: theme.colorScheme.outline),
                            const SizedBox(height: 12),
                            const Text('Belum ada varian'),
                            const SizedBox(height: 4),
                            Text(
                              'Tambahkan varian dengan harga, SKU, kode, dan stok masing-masing.',
                              textAlign: TextAlign.center,
                              style: theme.textTheme.bodySmall,
                            ),
                          ],
                        ),
                      ),
                    )
                  : ListView.separated(
                      padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
                      itemCount: _variants.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 8),
                      itemBuilder: (context, index) {
                        final variant = _variants[index];
                        return Card(
                          margin: EdgeInsets.zero,
                          child: ListTile(
                            title: Text(
                              variant.name,
                              style: const TextStyle(
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            subtitle: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const SizedBox(height: 2),
                                Text(
                                  'SKU ${variant.sku.isEmpty ? '-' : variant.sku}'
                                  '${variant.barcode == null || variant.barcode!.isEmpty ? '' : ' • ${variant.barcode}'}',
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  '${_money(variant.price)} • stok ${variant.stock}',
                                  style: TextStyle(
                                    color: variant.stock <= 0
                                        ? theme.colorScheme.error
                                        : null,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ],
                            ),
                            trailing: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                IconButton(
                                  tooltip: 'Ubah varian',
                                  onPressed:
                                      _busy ? null : () => _openEditor(variant),
                                  icon: const Icon(Icons.edit_outlined),
                                ),
                                IconButton(
                                  tooltip: 'Hapus varian',
                                  onPressed: _busy
                                      ? null
                                      : () => _deleteVariant(variant),
                                  icon: const Icon(Icons.delete_outline),
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
          child: SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed: _busy || _loading ? null : () => _openEditor(),
              icon: const Icon(Icons.add),
              label: const Text('Tambah Varian'),
            ),
          ),
        ),
      ],
    );
  }
}

class _VariantDraft {
  final String name;
  final String? sku;
  final String? barcode;
  final double price;
  final int stock;

  const _VariantDraft({
    required this.name,
    this.sku,
    this.barcode,
    required this.price,
    required this.stock,
  });
}

class _VariantEditorDialog extends StatefulWidget {
  final String productName;
  final ProductVariant? variant;

  const _VariantEditorDialog({required this.productName, this.variant});

  @override
  State<_VariantEditorDialog> createState() => _VariantEditorDialogState();
}

class _VariantEditorDialogState extends State<_VariantEditorDialog> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _name;
  late final TextEditingController _sku;
  late final TextEditingController _barcode;
  late final TextEditingController _price;
  late final TextEditingController _stock;

  @override
  void initState() {
    super.initState();
    final variant = widget.variant;
    _name = TextEditingController(text: variant?.name ?? '');
    _sku = TextEditingController(text: variant?.sku ?? '');
    _barcode = TextEditingController(text: variant?.barcode ?? '');
    _price = TextEditingController(
      text: variant == null ? '' : variant.price.toStringAsFixed(0),
    );
    _stock = TextEditingController(text: variant?.stock.toString() ?? '0');
  }

  @override
  void dispose() {
    _name.dispose();
    _sku.dispose();
    _barcode.dispose();
    _price.dispose();
    _stock.dispose();
    super.dispose();
  }

  double _parseNumber(String value) =>
      double.tryParse(value.replaceAll('.', '').replaceAll(',', '.')) ?? 0;

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text(widget.variant == null ? 'Tambah Varian' : 'Ubah Varian'),
      content: Form(
        key: _formKey,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                widget.productName,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: Theme.of(context).textTheme.bodySmall,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _name,
                autofocus: true,
                decoration: const InputDecoration(
                  labelText: 'Nama Varian',
                  hintText: 'mis. Panas / Dingin / Large',
                  prefixIcon: Icon(Icons.layers_outlined),
                ),
                validator: (value) => value == null || value.trim().isEmpty
                    ? 'Nama varian wajib diisi'
                    : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _sku,
                decoration: const InputDecoration(
                  labelText: 'SKU (opsional)',
                  prefixIcon: Icon(Icons.qr_code),
                ),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _barcode,
                decoration: const InputDecoration(
                  labelText: 'Barcode (opsional)',
                  prefixIcon: Icon(Icons.qr_code_scanner),
                ),
              ),
              const SizedBox(height: 12),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _price,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                        labelText: 'Harga Jual',
                        prefixIcon: Icon(Icons.payments_outlined),
                      ),
                      validator: (value) => _parseNumber(value ?? '') <= 0
                          ? 'Harga wajib diisi'
                          : null,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextFormField(
                      controller: _stock,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                        labelText: 'Stok',
                        prefixIcon: Icon(Icons.inventory_outlined),
                      ),
                      validator: (value) {
                        final parsed = int.tryParse(value ?? '');
                        return parsed == null || parsed < 0
                            ? 'Stok tidak valid'
                            : null;
                      },
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Batal'),
        ),
        FilledButton(
          onPressed: () {
            if (!_formKey.currentState!.validate()) return;
            Navigator.pop(
              context,
              _VariantDraft(
                name: _name.text.trim(),
                sku: _sku.text.trim().isEmpty ? null : _sku.text.trim(),
                barcode:
                    _barcode.text.trim().isEmpty ? null : _barcode.text.trim(),
                price: _parseNumber(_price.text),
                stock: int.tryParse(_stock.text.trim()) ?? 0,
              ),
            );
          },
          child: const Text('Simpan'),
        ),
      ],
    );
  }
}

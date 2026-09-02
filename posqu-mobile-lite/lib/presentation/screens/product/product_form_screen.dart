import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:uuid/uuid.dart';
import 'package:speech_to_text/speech_to_text.dart';

import '../../../core/widgets/app_button.dart';
import '../../../core/widgets/barcode_scanner_sheet.dart';
import '../../../core/utils/product_utils.dart';
import '../../../core/widgets/product_image.dart';
import '../../../core/widgets/app_text_field.dart';
import '../../providers/category/category_provider.dart';
import '../../providers/product/product_provider.dart';
import '../../providers/unit/unit_provider.dart';
import '../../providers/plan/plan_provider.dart';
import '../../../data/repositories/product_repository_impl.dart';
import '../../../domain/entities/product.dart';

class ProductFormScreen extends ConsumerStatefulWidget {
  final String? productId;

  const ProductFormScreen({super.key, this.productId});

  @override
  ConsumerState<ProductFormScreen> createState() => _ProductFormScreenState();
}

class _ProductFormScreenState extends ConsumerState<ProductFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final _skuController = TextEditingController();
  final _barcodeController = TextEditingController();
  final _nameController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _costPriceController = TextEditingController();
  final _sellingPriceController = TextEditingController();
  final _wholesalePriceController = TextEditingController();
  final _wholesaleMinQtyController = TextEditingController();
  final _stockController = TextEditingController();
  final _minStockController = TextEditingController();
  final _unitController = TextEditingController();
  final _imageUrlController = TextEditingController();
  String? _selectedCategoryId;
  String? _selectedUnit;
  bool _isLoading = false;
  bool _saving = false;
  bool _listening = false;
  Product? _existing;
  final SpeechToText _speech = SpeechToText();

  bool get isEditing => widget.productId != null;

  @override
  void initState() {
    super.initState();
    _loadExisting();
  }

  Future<void> _loadExisting() async {
    if (!isEditing) return;
    setState(() => _isLoading = true);
    final repository = ref.read(productRepositoryProvider);
    final result = await repository.getProduct(widget.productId!);
    result.fold(
      (failure) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(failure.message)),
          );
        }
      },
      (product) {
        _existing = product;
        _skuController.text = product.sku;
        _barcodeController.text = product.barcode ?? '';
        _nameController.text = product.name;
        _descriptionController.text = product.description ?? '';
        _costPriceController.text = _numText(product.costPrice);
        _sellingPriceController.text = _numText(product.sellingPrice);
        _wholesalePriceController.text = product.wholesalePrice > 0
            ? _numText(product.wholesalePrice)
            : '';
        _wholesaleMinQtyController.text = product.wholesaleMinQty > 0
            ? product.wholesaleMinQty.toString()
            : '';
        _stockController.text = product.stock.toString();
        _minStockController.text = _numText(product.minStock);
        _selectedUnit = product.unit.isNotEmpty ? product.unit : 'pcs';
        _unitController.text = _selectedUnit ?? 'pcs';
        _imageUrlController.text = product.imageUrl ?? '';
        _selectedCategoryId = product.categoryId;
      },
    );
    if (mounted) setState(() => _isLoading = false);
  }

  String _numText(double v) => v % 1 == 0 ? v.toInt().toString() : v.toString();

  @override
  void dispose() {
    _speech.stop();
    _skuController.dispose();
    _barcodeController.dispose();
    _nameController.dispose();
    _descriptionController.dispose();
    _costPriceController.dispose();
    _sellingPriceController.dispose();
    _wholesalePriceController.dispose();
    _wholesaleMinQtyController.dispose();
    _stockController.dispose();
    _minStockController.dispose();
    _unitController.dispose();
    _imageUrlController.dispose();
    super.dispose();
  }

  Future<void> _pickPhoto() async {
    try {
      final picker = ImagePicker();
      final picked = await picker.pickImage(
        source: ImageSource.gallery,
        maxWidth: 1024,
        imageQuality: 80,
      );
      if (picked != null) {
        setState(() => _imageUrlController.text = picked.path);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'Pemilih foto tidak tersedia di perangkat ini. Salin file ke perangkat lalu tempel jalurnya di kolom path.',
            ),
          ),
        );
      }
    }
  }

  // ================= BARCODE: KAMERA & SUARA =================

  Future<void> _scanBarcodeWithCamera() async {
    final code = await showBarcodeScannerSheet(context);
    if (code != null && code.trim().isNotEmpty && mounted) {
      setState(() => _barcodeController.text = code.trim());
    }
  }

  Future<void> _toggleVoiceBarcode() async {
    if (_listening) {
      await _speech.stop();
      setState(() => _listening = false);
      return;
    }
    try {
      final available = await _speech.initialize(
        onStatus: (status) {
          if (status == 'done' || status == 'notListening') {
            if (mounted) setState(() => _listening = false);
          }
        },
        onError: (error) {
          if (mounted) {
            setState(() => _listening = false);
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('Error suara: ${error.errorMsg}')),
            );
          }
        },
      );
      if (!available) {
        throw Exception('Speech recognition tidak tersedia');
      }
      setState(() => _listening = true);
      await _speech.listen(
        listenOptions: SpeechListenOptions(
          partialResults: true,
          cancelOnError: true,
          localeId: 'id_ID',
        ),
        onResult: (result) {
          final spoken = result.recognizedWords.trim();
          if (spoken.isEmpty) return;
          // Ambil digit bila pengguna menyebut angka langsung;
          // selain itu tampilkan apa adanya agar bisa dikoreksi manual.
          final digits = spoken.replaceAll(RegExp(r'[^0-9]'), '');
          final value = digits.length >= 4 ? digits : spoken;
          if (mounted) {
            setState(() => _barcodeController.text = value);
          }
        },
      );
    } catch (e) {
      if (mounted) {
        setState(() => _listening = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'Input suara tidak tersedia di perangkat ini. Gunakan ketik manual atau scan kamera.',
            ),
          ),
        );
      }
    }
  }

  Future<void> _saveProduct() async {
    final canStore = ref.read(canUseDatabaseProvider);
    if (!canStore) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Paket Free tidak bisa simpan produk ke database. Upgrade ke Pro/Enterprise di website (super-admin).')),
        );
        showDialog(
          context: context,
          builder: (_) => AlertDialog(
            title: const Text('Upgrade Paket'),
            content: const Text('Paket Free menonaktifkan penyimpanan produk ke database & sinkronisasi. Hubungi admin website untuk upgrade ke Pro/Enterprise.'),
            actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('OK'))],
          ),
        );
      }
      return;
    }
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);

    final now = DateTime.now();
    double parseNum(String v) => double.tryParse(v.replaceAll('.', '')) ?? 0;

    final name = _nameController.text.trim();
    final sku = _skuController.text.trim().isEmpty
        ? generateSku()
        : _skuController.text.trim();
    final costPrice = parseNum(_costPriceController.text);
    final sellingPrice = parseNum(_sellingPriceController.text);

    final product = Product(
      id: _existing?.id ?? const Uuid().v4(),
      sku: sku,
      slug: slugify(name),
      barcode: _barcodeController.text.trim().isEmpty
          ? null
          : _barcodeController.text.trim(),
      name: name,
      description: _descriptionController.text.trim().isEmpty
          ? null
          : _descriptionController.text.trim(),
      categoryId: _selectedCategoryId,
      costPrice: costPrice,
      sellingPrice: sellingPrice,
      marginPct: computeMarginPct(costPrice, sellingPrice),
      wholesalePrice: parseNum(_wholesalePriceController.text),
      wholesaleMinQty: int.tryParse(_wholesaleMinQtyController.text) ?? 0,
      minStock: parseNum(_minStockController.text),
      stock: int.tryParse(_stockController.text) ?? 0,
      unit: (_selectedUnit ?? _unitController.text.trim()).isEmpty
          ? 'pcs'
          : (_selectedUnit ?? _unitController.text.trim()),
      imageUrl: _imageUrlController.text.trim().isEmpty
          ? null
          : _imageUrlController.text.trim(),
      isActive: _existing?.isActive ?? true,
      type: _existing?.type ?? 'SINGLE',
      createdAt: _existing?.createdAt ?? now,
      updatedAt: now,
    );

    final repository = ref.read(productRepositoryProvider);
    final result = isEditing
        ? await repository.updateProduct(product)
        : await repository.createProduct(product);

    if (!mounted) return;
    result.fold(
      (failure) {
        setState(() => _saving = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(failure.message)),
        );
      },
      (_) {
        ref.invalidate(productListProvider);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(isEditing
                ? 'Produk berhasil diperbarui'
                : 'Produk berhasil ditambahkan'),
          ),
        );
        context.pop();
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final categoriesAsync = ref.watch(categoryListProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(isEditing ? 'Edit Produk' : 'Tambah Produk'),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : Center(
              child: ConstrainedBox(
                constraints:
                    const BoxConstraints(maxWidth: 720, minHeight: double.infinity),
                child: Form(
                    key: _formKey,
                    child: ListView(
                      padding: const EdgeInsets.all(16),
                      children: [
                  AppTextField(
                    label: 'SKU / Kode Produk',
                    hint: 'Kosongkan untuk dibuat otomatis',
                    prefixIcon: Icons.qr_code,
                    controller: _skuController,
                    suffixIcon: IconButton(
                      tooltip: 'Generate SKU',
                      icon: const Icon(Icons.autorenew),
                      onPressed: () {
                        setState(() {
                          _skuController.text = generateSku();
                        });
                      },
                    ),
                  ),
                  const SizedBox(height: 16),
                  AppTextField(
                    label: 'Barcode',
                    hint: 'Scan kamera, bicara, atau ketik manual',
                    prefixIcon: Icons.qr_code_scanner,
                    controller: _barcodeController,
                    suffixIcon: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        IconButton(
                          tooltip: 'Scan dengan kamera',
                          icon: const Icon(Icons.photo_camera_outlined),
                          onPressed: _scanBarcodeWithCamera,
                        ),
                        IconButton(
                          tooltip: 'Input dengan suara',
                          icon: Icon(
                            _listening ? Icons.mic : Icons.mic_none,
                            color: _listening ? Colors.red : null,
                          ),
                          onPressed: _toggleVoiceBarcode,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  AppTextField(
                    label: 'Nama Produk',
                    hint: 'Masukkan nama produk',
                    prefixIcon: Icons.inventory_2,
                    controller: _nameController,
                    validator: (v) =>
                        v?.isEmpty == true ? 'Nama produk wajib diisi' : null,
                  ),
                  const SizedBox(height: 16),
                  AppTextField(
                    label: 'Deskripsi',
                    hint: 'Masukkan deskripsi (opsional)',
                    prefixIcon: Icons.description,
                    controller: _descriptionController,
                    maxLines: 3,
                  ),
                  const SizedBox(height: 16),
                  categoriesAsync.when(
                    data: (categories) => DropdownButtonFormField<String>(
                      value: _selectedCategoryId,
                      decoration: const InputDecoration(
                        labelText: 'Kategori',
                        prefixIcon: Icon(Icons.category),
                      ),
                      items: categories.map((c) {
                        return DropdownMenuItem(value: c.id, child: Text(c.name));
                      }).toList(),
                      onChanged: (v) => setState(() => _selectedCategoryId = v),
                    ),
                    loading: () => const SizedBox(),
                    error: (_, __) => const SizedBox(),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: AppTextField(
                          label: 'Harga Beli',
                          hint: '0',
                          prefixIcon: Icons.shopping_cart,
                          keyboardType: TextInputType.number,
                          controller: _costPriceController,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: AppTextField(
                          label: 'Harga Jual',
                          hint: '0',
                          prefixIcon: Icons.attach_money,
                          keyboardType: TextInputType.number,
                          controller: _sellingPriceController,
                          validator: (v) =>
                              v?.isEmpty == true ? 'Harga jual wajib diisi' : null,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.blue.withOpacity(0.06),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.blue.withOpacity(0.25)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Row(
                          children: [
                            Icon(Icons.sell_outlined, size: 16, color: Colors.blue),
                            SizedBox(width: 6),
                            Text(
                              'Harga Grosir',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                color: Colors.blue,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Expanded(
                              child: AppTextField(
                                label: 'Harga Grosir',
                                hint: '0 (opsional)',
                                keyboardType: TextInputType.number,
                                controller: _wholesalePriceController,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: AppTextField(
                                label: 'Min. Qty Grosir',
                                hint: 'mis. 12',
                                keyboardType: TextInputType.number,
                                controller: _wholesaleMinQtyController,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Harga grosir otomatis dipakai di kasir saat jumlah >= min. qty.',
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  _buildPhotoSection(),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(
                        child: AppTextField(
                          label: 'Stok',
                          hint: '0',
                          prefixIcon: Icons.inventory,
                          keyboardType: TextInputType.number,
                          controller: _stockController,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: AppTextField(
                          label: 'Min. Stok',
                          hint: '0',
                          prefixIcon: Icons.warning,
                          keyboardType: TextInputType.number,
                          controller: _minStockController,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  _buildUnitDropdown(),
                  const SizedBox(height: 32),
                  AppButton(
                    label: isEditing ? 'Simpan Perubahan' : 'Simpan Produk',
                    loading: _saving,
                    onPressed: _saving ? null : _saveProduct,
                  ),
                  const SizedBox(height: 24),
                ],
                ),
              ),
            ),
          ),
    );
  }

  Widget _buildUnitDropdown() {
    final unitsAsync = ref.watch(unitsProvider);
    return Builder(
      builder: (context) {
        return unitsAsync.maybeWhen(
          orElse: () => _buildUnitField(),
          data: (units) {
            final current = _selectedUnit ?? 'pcs';
            final allUnits = units.contains(current) ? units : [...units, current];
            return DropdownButtonFormField<String>(
              value: current,
              decoration: const InputDecoration(
                labelText: 'Satuan',
                prefixIcon: Icon(Icons.straighten),
              ),
              items: [
                ...allUnits.map(
                  (u) => DropdownMenuItem(value: u, child: Text(u)),
                ),
                const DropdownMenuItem(
                  value: '__custom__',
                  child: Text('+ Satuan lain…'),
                ),
              ],
              onChanged: (v) {
                if (v == '__custom__') {
                  _showCustomUnitDialog(context);
                  return;
                }
                setState(() {
                  _selectedUnit = v;
                  _unitController.text = v ?? 'pcs';
                });
              },
            );
          },
        );
      },
    );
  }

  Widget _buildUnitField() {
    return AppTextField(
      label: 'Satuan',
      hint: 'contoh: pcs',
      prefixIcon: Icons.straighten,
      controller: _unitController,
      onChanged: (_) => setState(() => _selectedUnit = _unitController.text.trim()),
    );
  }

  Future<void> _showCustomUnitDialog(BuildContext context) async {
    final controller = TextEditingController(text: _unitController.text);
    final result = await showDialog<String>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Satuan Lain'),
        content: TextField(
          controller: controller,
          autofocus: true,
          decoration: const InputDecoration(
            labelText: 'Nama satuan',
            prefixIcon: Icon(Icons.straighten),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Batal'),
          ),
          FilledButton(
            onPressed: () =>
                Navigator.pop(dialogContext, controller.text.trim()),
            child: const Text('Pakai'),
          ),
        ],
      ),
    );
    if (result != null && result.isNotEmpty && mounted) {
      setState(() {
        _selectedUnit = result;
        _unitController.text = result;
      });
    }
  }

  Widget _buildPhotoSection() {
    final path = _imageUrlController.text.trim();

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerHighest.withOpacity(0.4),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.photo_outlined, size: 16),
              SizedBox(width: 6),
              Text('Foto Produk',
                  style: TextStyle(fontWeight: FontWeight.bold)),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              ProductImageThumb(url: path.isEmpty ? null : path, size: 72),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    OutlinedButton.icon(
                      onPressed: _pickPhoto,
                      icon: const Icon(Icons.photo_library_outlined, size: 18),
                      label: const Text('Pilih dari Galeri'),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Di desktop, tempel jalur file di bawah.',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _imageUrlController,
            decoration: InputDecoration(
              labelText: 'Path / URL Foto',
              hintText: '/storage/emulated/0/... atau C:\\foto\\produk.jpg',
              isDense: true,
              border: const OutlineInputBorder(),
              suffixIcon: path.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear),
                      onPressed: () =>
                          setState(() => _imageUrlController.clear()),
                    )
                  : null,
            ),
            onChanged: (_) => setState(() {}),
          ),
        ],
      ),
    );
  }
}

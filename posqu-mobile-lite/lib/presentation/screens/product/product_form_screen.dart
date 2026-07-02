import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/widgets/app_button.dart';
import '../../../core/widgets/app_text_field.dart';
import '../../providers/category/category_provider.dart';

class ProductFormScreen extends ConsumerStatefulWidget {
  final int? productId;

  const ProductFormScreen({super.key, this.productId});

  @override
  ConsumerState<ProductFormScreen> createState() => _ProductFormScreenState();
}

class _ProductFormScreenState extends ConsumerState<ProductFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final _codeController = TextEditingController();
  final _barcodeController = TextEditingController();
  final _nameController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _purchasePriceController = TextEditingController();
  final _sellingPriceController = TextEditingController();
  final _stockController = TextEditingController();
  final _minStockController = TextEditingController();
  final _unitController = TextEditingController();
  int? _selectedCategoryId;
  bool _isLoading = false;

  bool get isEditing => widget.productId != null;

  @override
  Widget build(BuildContext context) {
    final categoriesAsync = ref.watch(categoryListProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(isEditing ? 'Edit Produk' : 'Tambah Produk'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              AppTextField(
                label: 'Kode Produk',
                hint: 'Masukkan kode produk',
                prefixIcon: Icons.qr_code,
                controller: _codeController,
                validator: (v) => v?.isEmpty == true ? 'Kode produk wajib diisi' : null,
              ),
              const SizedBox(height: 16),
              AppTextField(
                label: 'Barcode',
                hint: 'Masukkan barcode (opsional)',
                prefixIcon: Icons.qr_code_scanner,
                controller: _barcodeController,
              ),
              const SizedBox(height: 16),
              AppTextField(
                label: 'Nama Produk',
                hint: 'Masukkan nama produk',
                prefixIcon: Icons.inventory_2,
                controller: _nameController,
                validator: (v) => v?.isEmpty == true ? 'Nama produk wajib diisi' : null,
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
                data: (categories) => DropdownButtonFormField<int>(
                  initialValue: _selectedCategoryId,
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
                children: [
                  Expanded(
                    child: AppTextField(
                      label: 'Harga Beli',
                      hint: '0',
                      prefixIcon: Icons.shopping_cart,
                      keyboardType: TextInputType.number,
                      controller: _purchasePriceController,
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
                      validator: (v) => v?.isEmpty == true ? 'Harga jual wajib diisi' : null,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: AppTextField(
                      label: 'Stok Awal',
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
              AppTextField(
                label: 'Satuan',
                hint: 'pcs, kg, liter, dll',
                prefixIcon: Icons.straighten,
                controller: _unitController,
              ),
              const SizedBox(height: 32),
              AppButton(
                label: isEditing ? 'Simpan Perubahan' : 'Simpan Produk',
                loading: _isLoading,
                onPressed: _saveProduct,
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _saveProduct() {
    if (_formKey.currentState!.validate()) {
      setState(() => _isLoading = true);
      Future.delayed(const Duration(seconds: 1), () {
        setState(() => _isLoading = false);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(isEditing ? 'Produk berhasil diperbarui' : 'Produk berhasil ditambahkan')),
          );
          context.pop();
        }
      });
    }
  }
}

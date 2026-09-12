import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:uuid/uuid.dart';

import '../../../data/repositories/customer_repository_impl.dart';
import '../../../domain/entities/customer.dart';

class CustomerFormScreen extends ConsumerStatefulWidget {
  final String? customerId;

  const CustomerFormScreen({super.key, this.customerId});

  @override
  ConsumerState<CustomerFormScreen> createState() => _CustomerFormScreenState();
}

class _CustomerFormScreenState extends ConsumerState<CustomerFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _emailController = TextEditingController();
  final _addressController = TextEditingController();
  final _cityController = TextEditingController();
  bool _isWholesale = false;
  bool _isLoading = false;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    if (widget.customerId != null) _loadExisting();
  }

  Future<void> _loadExisting() async {
    setState(() => _isLoading = true);
    final repo = ref.read(customerRepositoryProvider);
    final res = await repo.getCustomer(widget.customerId!);
    res.fold(
      (f) {
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(f.message)));
      },
      (c) {
        _nameController.text = c.name;
        _phoneController.text = c.phone ?? '';
        _emailController.text = c.email ?? '';
        _addressController.text = c.address ?? '';
        _cityController.text = c.city ?? '';
        _isWholesale = c.isWholesale || c.customerType == 'GROSIR';
      },
    );
    if (mounted) setState(() => _isLoading = false);
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    _addressController.dispose();
    _cityController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);
    final repo = ref.read(customerRepositoryProvider);
    final now = DateTime.now();
    final isEdit = widget.customerId != null;

    // Cek existing untuk preserve createdAt
    Customer? existing;
    if (isEdit) {
      final r = await repo.getCustomer(widget.customerId!);
      r.fold((_) {}, (c) => existing = c);
    }

    final customer = Customer(
      id: widget.customerId ?? const Uuid().v4(),
      name: _nameController.text.trim(),
      phone: _phoneController.text.trim().isEmpty ? null : _phoneController.text.trim(),
      email: _emailController.text.trim().isEmpty ? null : _emailController.text.trim(),
      address: _addressController.text.trim().isEmpty ? null : _addressController.text.trim(),
      city: _cityController.text.trim().isEmpty ? null : _cityController.text.trim(),
      isWholesale: _isWholesale,
      customerType: _isWholesale ? 'GROSIR' : 'RETAIL',
      isActive: true,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    );

    final result = isEdit ? await repo.updateCustomer(customer) : await repo.createCustomer(customer);
    if (!mounted) return;
    setState(() => _saving = false);
    result.fold(
      (f) => ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(f.message))),
      (_) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(isEdit ? 'Pelanggan diperbarui — ${_isWholesale ? 'harga grosir aktif' : 'harga normal'}' : 'Pelanggan ditambahkan')) );
        context.pop();
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.customerId != null ? 'Edit Pelanggan' : 'Tambah Pelanggan'),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Form(
                key: _formKey,
                child: Column(
                  children: [
                    TextFormField(
                      controller: _nameController,
                      decoration: const InputDecoration(
                        labelText: 'Nama Pelanggan',
                        prefixIcon: Icon(Icons.person),
                      ),
                      validator: (v) => v?.isEmpty == true ? 'Nama wajib diisi' : null,
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _phoneController,
                      decoration: const InputDecoration(
                        labelText: 'No. Telepon',
                        prefixIcon: Icon(Icons.phone),
                      ),
                      keyboardType: TextInputType.phone,
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _emailController,
                      decoration: const InputDecoration(
                        labelText: 'Email',
                        prefixIcon: Icon(Icons.email),
                      ),
                      keyboardType: TextInputType.emailAddress,
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _addressController,
                      decoration: const InputDecoration(
                        labelText: 'Alamat',
                        prefixIcon: Icon(Icons.location_on),
                      ),
                      maxLines: 2,
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _cityController,
                      decoration: const InputDecoration(
                        labelText: 'Kota',
                        prefixIcon: Icon(Icons.location_city),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: _isWholesale ? Colors.blue.withOpacity(0.08) : Theme.of(context).colorScheme.surfaceContainerLow,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: _isWholesale ? Colors.blue : Theme.of(context).dividerColor.withOpacity(0.3)),
                      ),
                      child: SwitchListTile(
                        contentPadding: EdgeInsets.zero,
                        title: const Row(
                          children: [
                            Icon(Icons.workspace_premium, size: 18, color: Colors.blue),
                            SizedBox(width: 6),
                            Text('Pelanggan Grosir', style: TextStyle(fontWeight: FontWeight.w600)),
                          ],
                        ),
                        subtitle: Text(
                          _isWholesale
                              ? 'Harga grosir otomatis di kasir (tanpa minimal qty)'
                              : 'Harga normal (grosir hanya jika qty ≥ min)',
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                        value: _isWholesale,
                        onChanged: (v) => setState(() => _isWholesale = v),
                      ),
                    ),
                    const SizedBox(height: 32),
                    FilledButton(
                      onPressed: _saving ? null : _save,
                      child: _saving
                          ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                          : Text(widget.customerId != null ? 'Simpan Perubahan' : 'Simpan Pelanggan'),
                    ),
                  ],
                ),
              ),
            ),
    );
  }
}

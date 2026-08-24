import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:uuid/uuid.dart';

import '../../providers/kasir/kasir_provider.dart';
import '../../providers/kasir/kasir_state.dart';
import '../../../core/utils/currency_formatter.dart';
import '../../../core/widgets/app_button.dart';
import '../../../domain/entities/product.dart';

class KasirScreen extends ConsumerStatefulWidget {
  const KasirScreen({super.key});

  @override
  ConsumerState<KasirScreen> createState() => _KasirScreenState();
}

class _KasirScreenState extends ConsumerState<KasirScreen> {
  final _searchController = TextEditingController();
  bool _showScanner = false;

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final kasirState = ref.watch(kasirStateProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Kasir'),
        actions: [
          IconButton(
            icon: Icon(_showScanner ? Icons.close : Icons.qr_code_scanner),
            onPressed: () => setState(() => _showScanner = !_showScanner),
          ),
        ],
      ),
      body: Column(
        children: [
          if (_showScanner) _buildScanner(),
          _buildSearchBar(),
          Expanded(
            child: Row(
              children: [
                Expanded(
                  flex: 3,
                  child: _buildProductList(kasirState),
                ),
                Expanded(
                  flex: 2,
                  child: _buildCartPanel(kasirState),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildScanner() {
    return SizedBox(
      height: 200,
      child: MobileScanner(
        onDetect: (capture) {
          final barcode = capture.barcodes.first.rawValue;
          if (barcode != null) {
            ref.read(kasirStateProvider.notifier).scanBarcode(barcode);
            setState(() => _showScanner = false);
          }
        },
      ),
    );
  }

  Widget _buildSearchBar() {
    return Padding(
      padding: const EdgeInsets.all(12),
      child: TextField(
        controller: _searchController,
        decoration: InputDecoration(
          hintText: 'Cari produk...',
          prefixIcon: const Icon(Icons.search),
          suffixIcon: _searchController.text.isNotEmpty
              ? IconButton(
                  icon: const Icon(Icons.clear),
                  onPressed: () {
                    _searchController.clear();
                    setState(() {});
                  },
                )
              : null,
        ),
        onChanged: (_) => setState(() {}),
      ),
    );
  }

  Widget _buildProductList(KasirState kasirState) {
    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 8),
      itemCount: 20,
      itemBuilder: (context, index) {
        return Card(
          child: ListTile(
            leading: Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.primaryContainer,
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.inventory_2),
            ),
            title: Text('Produk ${index + 1}'),
            subtitle: Text(CurrencyFormatter.format(15000 + (index * 1000))),
            trailing: IconButton(
              icon: const Icon(Icons.add_circle_outline),
              onPressed: () {
                ref.read(kasirStateProvider.notifier).addProduct(
                      _dummyProduct(index),
                    );
              },
            ),
          ),
        );
      },
    );
  }

  Widget _buildCartPanel(KasirState kasirState) {
    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        border: Border(
          left: BorderSide(color: Theme.of(context).dividerTheme.color ?? Colors.grey[300]!),
        ),
      ),
      child: Column(
        children: [
          Expanded(
            child: kasirState.items.isEmpty
                ? const Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.shopping_cart_outlined, size: 48, color: Colors.grey),
                        SizedBox(height: 8),
                        Text('Belum ada item'),
                      ],
                    ),
                  )
                : ListView.builder(
                    itemCount: kasirState.items.length,
                    itemBuilder: (context, index) {
                      final item = kasirState.items[index];
                      return Dismissible(
                        key: ValueKey('${item.productId}-$index'),
                        direction: DismissDirection.endToStart,
                        onDismissed: (_) =>
                            ref.read(kasirStateProvider.notifier).removeItem(index),
                        child: ListTile(
                          dense: true,
                          title: Text(item.name.isEmpty ? 'Produk' : item.name,
                              style: const TextStyle(fontSize: 14)),
                          subtitle: Text(
                            '${CurrencyFormatter.format(item.price)} x${item.qty}',
                            style: const TextStyle(fontSize: 12),
                          ),
                          trailing: Text(
                            CurrencyFormatter.format(item.lineTotal),
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 14,
                            ),
                          ),
                        ),
                      );
                    },
                  ),
          ),
          const Divider(height: 1),
          Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _buildSummaryRow('Subtotal', CurrencyFormatter.format(kasirState.subtotal)),
                const SizedBox(height: 4),
                _buildSummaryRow('Diskon', CurrencyFormatter.format(kasirState.discount)),
                const SizedBox(height: 4),
                _buildSummaryRow('Pajak', CurrencyFormatter.format(kasirState.tax)),
                const Divider(),
                _buildSummaryRow(
                  'Total',
                  CurrencyFormatter.format(kasirState.total),
                  bold: true,
                ),
                const SizedBox(height: 12),
                _buildPaymentSelector(kasirState.paymentMethod),
                const SizedBox(height: 8),
                AppButton(
                  label: 'Bayar (Rp ${CurrencyFormatter.formatWithoutSymbol(kasirState.total)})',
                  onPressed: kasirState.items.isEmpty
                      ? null
                      : () => _showPaymentDialog(kasirState),
                ),
              ],
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
        Text(label, style: TextStyle(fontSize: 14, fontWeight: bold ? FontWeight.bold : FontWeight.normal)),
        Text(value, style: TextStyle(fontWeight: bold ? FontWeight.bold : FontWeight.normal)),
      ],
    );
  }

  Widget _buildPaymentSelector(String currentMethod) {
    return Row(
      children: [
        _PaymentChip(
          label: 'Tunai',
          icon: Icons.money,
          selected: currentMethod == 'cash',
          onSelected: () =>
              ref.read(kasirStateProvider.notifier).setPaymentMethod('cash'),
        ),
        const SizedBox(width: 8),
        _PaymentChip(
          label: 'QRIS',
          icon: Icons.qr_code,
          selected: currentMethod == 'qris',
          onSelected: () =>
              ref.read(kasirStateProvider.notifier).setPaymentMethod('qris'),
        ),
        const SizedBox(width: 8),
        _PaymentChip(
          label: 'Transfer',
          icon: Icons.account_balance,
          selected: currentMethod == 'transfer',
          onSelected: () =>
              ref.read(kasirStateProvider.notifier).setPaymentMethod('transfer'),
        ),
      ],
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
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
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
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Batal')),
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
    final success = await ref.read(kasirStateProvider.notifier).checkout('');
    if (success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Pembayaran berhasil!')),
      );
    }
  }

  Product _dummyProduct(int index) {
    final now = DateTime.now();
    return Product(
      id: const Uuid().v4(),
      sku: 'PRD${1000 + index}',
      barcode: '899${1000000 + index}',
      name: 'Produk ${index + 1}',
      costPrice: 10000.0 + (index * 1000),
      sellingPrice: 15000.0 + (index * 1000),
      stock: 100,
      unit: 'pcs',
      createdAt: now,
      updatedAt: now,
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

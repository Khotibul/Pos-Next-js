import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../providers/sale/sale_provider.dart';
import '../../../core/utils/currency_formatter.dart';
import '../../../core/utils/date_formatter.dart';
import '../../../core/widgets/loading_widget.dart';

class SaleDetailScreen extends ConsumerWidget {
  final String saleId;

  const SaleDetailScreen({super.key, required this.saleId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final salesAsync = ref.watch(saleListProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Detail Penjualan')),
      body: salesAsync.when(
        data: (sales) {
          final sale = sales.where((s) => s.id == saleId).firstOrNull;
          if (sale == null) {
            return const Center(child: Text('Penjualan tidak ditemukan'));
          }

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    children: [
                      Text(
                        sale.invoiceNo,
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        DateFormatter.formatFullDate(sale.createdAt),
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              color: Theme.of(context).colorScheme.onSurfaceVariant,
                            ),
                      ),
                      const Divider(height: 24),
                      _DetailRow('Status', sale.status == 'PAID' ? 'Selesai' : sale.status),
                      _DetailRow('Pembayaran', _getPaymentLabel(sale.paymentMethod)),
                      if (sale.customerName != null)
                        _DetailRow('Pelanggan', sale.customerName!),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Item',
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                fontWeight: FontWeight.bold,
                              )),
                      const SizedBox(height: 12),
                      ...sale.items.map((item) => Padding(
                            padding: const EdgeInsets.only(bottom: 8),
                            child: Row(
                              children: [
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(item.name.isEmpty ? 'Produk' : item.name),
                                      Text(
                                        '${item.qty} x ${CurrencyFormatter.format(item.price)}',
                                        style: Theme.of(context).textTheme.bodySmall,
                                      ),
                                    ],
                                  ),
                                ),
                                Text(
                                  CurrencyFormatter.format(item.lineTotal),
                                  style: const TextStyle(fontWeight: FontWeight.bold),
                                ),
                              ],
                            ),
                          )),
                      const Divider(),
                      _DetailRow('Subtotal', CurrencyFormatter.format(sale.subtotal)),
                      if (sale.discount > 0)
                        _DetailRow('Diskon', CurrencyFormatter.format(sale.discount)),
                      if (sale.tax > 0)
                        _DetailRow('Pajak', CurrencyFormatter.format(sale.tax)),
                      const Divider(),
                      _DetailRow('Total', CurrencyFormatter.format(sale.total), bold: true),
                      _DetailRow('Bayar', CurrencyFormatter.format(sale.paidAmount)),
                      _DetailRow('Kembali', CurrencyFormatter.format(sale.changeAmount)),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () {},
                      icon: const Icon(Icons.print, size: 18),
                      label: const Text('Cetak'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () {},
                      icon: const Icon(Icons.share, size: 18),
                      label: const Text('Bagikan'),
                    ),
                  ),
                ],
              ),
            ],
          );
        },
        loading: () => const FullScreenLoading(),
        error: (_, __) => const Center(child: Text('Gagal memuat detail')),
      ),
    );
  }

  String _getPaymentLabel(String method) {
    switch (method) {
      case 'cash':
        return 'Tunai';
      case 'qris':
        return 'QRIS';
      case 'transfer':
        return 'Transfer';
      default:
        return method;
    }
  }
}

class _DetailRow extends StatelessWidget {
  final String label;
  final String value;
  final bool bold;

  const _DetailRow(this.label, this.value, {this.bold = false});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(fontWeight: bold ? FontWeight.bold : FontWeight.normal)),
          Text(value, style: TextStyle(fontWeight: bold ? FontWeight.bold : FontWeight.normal)),
        ],
      ),
    );
  }
}

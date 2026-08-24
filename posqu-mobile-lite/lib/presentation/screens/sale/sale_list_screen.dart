import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../providers/sale/sale_provider.dart';
import '../../../core/utils/currency_formatter.dart';
import '../../../core/utils/date_formatter.dart';
import '../../../core/widgets/empty_state.dart';
import '../../../core/widgets/loading_widget.dart';

class SaleListScreen extends ConsumerWidget {
  const SaleListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final salesAsync = ref.watch(saleListProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Penjualan')),
      body: salesAsync.when(
        data: (sales) {
          if (sales.isEmpty) {
            return const EmptyState(
              icon: Icons.receipt_long_outlined,
              title: 'Belum ada penjualan',
              subtitle: 'Penjualan akan muncul di sini',
              actionLabel: 'Mulai Kasir',
            );
          }
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(saleListProvider),
            child: ListView.builder(
              padding: const EdgeInsets.all(12),
              itemCount: sales.length,
              itemBuilder: (context, index) {
                final sale = sales[index];
                return Card(
                  child: ListTile(
                    leading: Container(
                      width: 48,
                      height: 48,
                      decoration: BoxDecoration(
                        color: _getPaymentColor(sale.paymentMethod).withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Icon(
                        _getPaymentIcon(sale.paymentMethod),
                        color: _getPaymentColor(sale.paymentMethod),
                      ),
                    ),
                    title: Text(sale.invoiceNo),
                    subtitle: Text(
                      '${DateFormatter.formatDateTime(sale.createdAt)} | ${_getPaymentLabel(sale.paymentMethod)}',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                    trailing: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          CurrencyFormatter.format(sale.total),
                          style: const TextStyle(fontWeight: FontWeight.bold),
                        ),
                        Text(
                          '${sale.items.length} item',
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      ],
                    ),
                    onTap: () => context.push('/sales/${sale.id}'),
                  ),
                );
              },
            ),
          );
        },
        loading: () => const LoadingCard(),
        error: (_, __) => const EmptyState(
          icon: Icons.error_outline,
          title: 'Gagal memuat data',
        ),
      ),
    );
  }

  IconData _getPaymentIcon(String method) {
    switch (method) {
      case 'cash':
        return Icons.money;
      case 'qris':
        return Icons.qr_code;
      case 'transfer':
        return Icons.account_balance;
      default:
        return Icons.payment;
    }
  }

  Color _getPaymentColor(String method) {
    switch (method) {
      case 'cash':
        return Colors.green;
      case 'qris':
        return Colors.blue;
      case 'transfer':
        return Colors.purple;
      default:
        return Colors.grey;
    }
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

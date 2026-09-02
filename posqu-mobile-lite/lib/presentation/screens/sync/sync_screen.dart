import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../providers/plan/plan_provider.dart';
import '../../providers/sync/sync_provider.dart';
import '../../providers/product/product_provider.dart';
import '../../providers/sale/sale_provider.dart';
import '../../../core/utils/date_formatter.dart';

class SyncScreen extends ConsumerWidget {
  const SyncScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final syncStatusAsync = ref.watch(syncStatusProvider);
    final syncActions = ref.read(syncActionProvider);
    final canSync = ref.watch(canSyncProvider);
    final plan = ref.watch(tenantPlanProvider).valueOrNull;

    return Scaffold(
      appBar: AppBar(title: const Text('Sinkronisasi')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                children: [
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Theme.of(context)
                          .colorScheme
                          .primaryContainer
                          .withValues(alpha: 0.5),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      Icons.sync,
                      size: 44,
                      color: Theme.of(context).colorScheme.primary,
                    ),
                  ),
                  const SizedBox(height: 14),
                  Text(
                    'Sinkronisasi Data',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Data offline otomatis terkirim saat online;\n'
                    'data server ditarik ke perangkat.',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                        ),
                  ),
                  if (!canSync)
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(color: Colors.red.shade700, borderRadius: BorderRadius.circular(12)),
                      child: Row(
                        children: [
                          const Icon(Icons.workspace_premium, color: Colors.white, size: 18),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              plan != null ? 'Paket ${plan.planName} (Free) — sinkronisasi PostgreSQL nonaktif. Upgrade ke Pro/Enterprise di website super-admin untuk aktifkan database & sync.' : 'Paket Free — sinkronisasi nonaktif. Hubungi admin website untuk upgrade.',
                              style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600),
                            ),
                          ),
                        ],
                      ),
                    ),
                  if (!canSync) const SizedBox(height: 12),
                  const SizedBox(height: 18),
                  syncStatusAsync.when(
                    data: (status) => Column(
                      children: [
                        _StatusChip(
                          icon: Icons.receipt_long_outlined,
                          label: 'Penjualan belum terkirim',
                          value: '${status.pendingSales}',
                          color: status.pendingSales > 0
                              ? Colors.orange
                              : Colors.green,
                        ),
                        const SizedBox(height: 8),
                        _StatusChip(
                          icon: Icons.inventory_2_outlined,
                          label: 'Produk belum terkirim',
                          value: '${status.pendingProducts}',
                          color: status.pendingProducts > 0
                              ? Colors.orange
                              : Colors.green,
                        ),
                        const SizedBox(height: 8),
                        _StatusChip(
                          icon: Icons.category_outlined,
                          label: 'Kategori belum terkirim',
                          value: '${status.pendingCategories}',
                          color: status.pendingCategories > 0
                              ? Colors.orange
                              : Colors.green,
                        ),
                        const SizedBox(height: 8),
                        _StatusChip(
                          icon: Icons.people_outline,
                          label: 'Pelanggan belum terkirim',
                          value: '${status.pendingCustomers}',
                          color: status.pendingCustomers > 0
                              ? Colors.orange
                              : Colors.green,
                        ),
                        const SizedBox(height: 8),
                        _StatusChip(
                          icon: Icons.local_shipping_outlined,
                          label: 'Supplier belum terkirim',
                          value: '${status.pendingSuppliers}',
                          color: status.pendingSuppliers > 0
                              ? Colors.orange
                              : Colors.green,
                        ),
                        const SizedBox(height: 12),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.history,
                                size: 14,
                                color: Theme.of(context)
                                    .colorScheme
                                    .onSurfaceVariant),
                            const SizedBox(width: 6),
                            Text(
                              status.lastSync == null
                                  ? 'Belum pernah sinkronisasi'
                                  : 'Terakhir: ${DateFormatter.formatDateTime(status.lastSync!)}',
                              style: Theme.of(context)
                                  .textTheme
                                  .bodySmall
                                  ?.copyWith(
                                    color: Theme.of(context)
                                        .colorScheme
                                        .onSurfaceVariant,
                                  ),
                            ),
                          ],
                        ),
                      ],
                    ),
                    loading: () => const CircularProgressIndicator(),
                    error: (_, __) => const Text('Gagal memuat status'),
                  ),
                  const SizedBox(height: 22),
                  FilledButton.icon(
                    onPressed: !canSync
                        ? null
                        : () async {
                            final success = await syncActions.syncNow();
                            if (context.mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text(success
                                      ? 'Sinkronisasi selesai'
                                      : 'Sinkronisasi gagal — periksa koneksi'),
                                ),
                              );
                              ref.invalidate(syncStatusProvider);
                              ref.invalidate(productListProvider);
                              ref.invalidate(saleListProvider);
                            }
                          },
                    icon: const Icon(Icons.sync),
                    label: Text(canSync ? 'Sinkronisasi Sekarang' : 'Upgrade untuk Sinkronisasi'),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          Card(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Text('Informasi',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                          )),
                ),
                const ListTile(
                  dense: true,
                  leading: Icon(Icons.cloud_upload_outlined),
                  title: Text('Transaksi & data offline otomatis terkirim saat online'),
                ),
                const ListTile(
                  dense: true,
                  leading: Icon(Icons.cloud_download_outlined),
                  title: Text('Produk, stok, dan penjualan dari website ditarik otomatis'),
                ),
                const ListTile(
                  dense: true,
                  leading: Icon(Icons.wifi),
                  title: Text('Pastikan koneksi internet stabil saat sinkronisasi'),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _StatusChip extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color color;

  const _StatusChip({
    required this.icon,
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(width: 12),
          Text(label, style: Theme.of(context).textTheme.bodyMedium),
          const Spacer(),
          Text(value,
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: color,
                  )),
        ],
      ),
    );
  }
}

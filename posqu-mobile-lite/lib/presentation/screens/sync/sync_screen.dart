import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../providers/sync/sync_provider.dart';

class SyncScreen extends ConsumerWidget {
  const SyncScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final syncStatusAsync = ref.watch(syncStatusProvider);
    final syncActions = ref.read(syncActionProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Sinkronisasi')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                children: [
                  Icon(
                    Icons.sync,
                    size: 64,
                    color: Theme.of(context).colorScheme.primary,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Sinkronisasi Data',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Data offline akan otomatis tersinkronisasi saat terhubung ke internet',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                        ),
                  ),
                  const SizedBox(height: 24),
                  syncStatusAsync.when(
                    data: (status) => Column(
                      children: [
                        _StatusChip(
                          icon: Icons.hourglass_empty,
                          label: 'Antrian',
                          value: '${status.pendingCount}',
                          color: Colors.orange,
                        ),
                        const SizedBox(height: 8),
                        _StatusChip(
                          icon: Icons.check_circle,
                          label: 'Tersinkronisasi',
                          value: '${status.syncedCount}',
                          color: Colors.green,
                        ),
                        const SizedBox(height: 8),
                        _StatusChip(
                          icon: Icons.error,
                          label: 'Gagal',
                          value: '${status.failedCount}',
                          color: Colors.red,
                        ),
                      ],
                    ),
                    loading: () => const CircularProgressIndicator(),
                    error: (_, __) => const Text('Gagal memuat status'),
                  ),
                  const SizedBox(height: 24),
                  FilledButton.icon(
                    onPressed: () async {
                      final success = await syncActions.syncNow();
                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text(success ? 'Sinkronisasi berhasil!' : 'Sinkronisasi gagal'),
                          ),
                        );
                        ref.invalidate(syncStatusProvider);
                      }
                    },
                    icon: const Icon(Icons.sync),
                    label: const Text('Sinkronisasi Sekarang'),
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
                  leading: Icon(Icons.info_outline),
                  title: Text('Data yang belum tersinkronisasi akan tetap aman di perangkat Anda'),
                ),
                const ListTile(
                  leading: Icon(Icons.wifi),
                  title: Text('Pastikan koneksi internet stabil untuk sinkronisasi'),
                ),
                const ListTile(
                  leading: Icon(Icons.security),
                  title: Text('Data dienkripsi selama proses sinkronisasi'),
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
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Icon(icon, color: color),
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

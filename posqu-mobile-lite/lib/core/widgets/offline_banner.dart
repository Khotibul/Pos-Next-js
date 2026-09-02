import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../network/connection_status_provider.dart';

class OfflineBanner extends ConsumerWidget {
  const OfflineBanner({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isOnline = ref.watch(isOnlineProvider);
    if (isOnline) return const SizedBox.shrink();
    return Material(
      color: Colors.orange.shade700,
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          child: Row(
            children: [
              const Icon(Icons.wifi_off, size: 16, color: Colors.white),
              const SizedBox(width: 8),
              const Expanded(
                child: Text(
                  'Mode offline — data disimpan di SQLite, akan sinkron ke PostgreSQL saat online',
                  style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600),
                ),
              ),
              TextButton(
                style: TextButton.styleFrom(foregroundColor: Colors.white, visualDensity: VisualDensity.compact),
                onPressed: () => ref.invalidate(isOnlineProvider),
                child: const Text('Cek', style: TextStyle(fontSize: 11)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class OnlineSyncBanner extends ConsumerWidget {
  const OnlineSyncBanner({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isOnline = ref.watch(isOnlineProvider);
    if (!isOnline) return const SizedBox.shrink();
    return Material(
      color: Colors.green.shade600,
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
          child: Row(
            children: [
              const Icon(Icons.cloud_done, size: 14, color: Colors.white),
              const SizedBox(width: 6),
              const Expanded(
                child: Text(
                  'Online — akses langsung ke PostgreSQL via posqupro.co-id.id',
                  style: TextStyle(color: Colors.white, fontSize: 11),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(color: Colors.white.withOpacity(0.2), borderRadius: BorderRadius.circular(10)),
                child: const Text('Sinkron', style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

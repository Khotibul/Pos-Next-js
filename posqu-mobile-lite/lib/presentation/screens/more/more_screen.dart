import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/auth/role_permissions.dart';
import '../../providers/auth/auth_provider.dart';

class MoreScreen extends ConsumerWidget {
  const MoreScreen({super.key});

  static const List<({String route, IconData icon, String title, String subtitle})>
      _items = [
    (
      route: '/reports',
      icon: Icons.assessment_outlined,
      title: 'Laporan',
      subtitle: 'Ringkasan penjualan & produk terlaris',
    ),
    (
      route: '/shifts',
      icon: Icons.shield_outlined,
      title: 'Shift Kasir',
      subtitle: 'Buka/tutup shift dan riwayat shift',
    ),
    (
      route: '/cash',
      icon: Icons.monetization_on_outlined,
      title: 'Kas',
      subtitle: 'Catat uang masuk & keluar',
    ),
    (
      route: '/purchases',
      icon: Icons.add_shopping_cart,
      title: 'Pembelian',
      subtitle: 'Riwayat pembelian stok dari supplier',
    ),
    (
      route: '/returns',
      icon: Icons.assignment_return_outlined,
      title: 'Retur',
      subtitle: 'Retur penjualan & pembelian',
    ),
    (
      route: '/customers',
      icon: Icons.people_outline,
      title: 'Pelanggan',
      subtitle: 'Kelola data pelanggan',
    ),
    (
      route: '/suppliers',
      icon: Icons.local_shipping_outlined,
      title: 'Supplier',
      subtitle: 'Kelola data supplier',
    ),
    (
      route: '/categories',
      icon: Icons.category_outlined,
      title: 'Kategori',
      subtitle: 'Kelola kategori produk',
    ),
    (
      route: '/settings',
      icon: Icons.settings_outlined,
      title: 'Pengaturan',
      subtitle: 'Printer, API, dan tampilan aplikasi',
    ),
    (
      route: '/sync',
      icon: Icons.sync_outlined,
      title: 'Sinkronisasi',
      subtitle: 'Status sinkronisasi data ke server',
    ),
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final role = ref.watch(authStateProvider).maybeWhen(
          authenticated: (user) => user.role,
          orElse: () => null,
        );
    final items = _items
        .where((item) => RolePermissions.canAccessRoute(role, item.route))
        .toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Lainnya'),
        automaticallyImplyLeading: false,
      ),
      body: ListView.separated(
        padding: const EdgeInsets.all(12),
        itemCount: items.length,
        separatorBuilder: (_, __) => const SizedBox(height: 4),
        itemBuilder: (context, index) {
          final item = items[index];
          return Card(
            margin: EdgeInsets.zero,
            child: ListTile(
              leading: CircleAvatar(
                backgroundColor:
                    Theme.of(context).colorScheme.primaryContainer.withOpacity(0.5),
                child: Icon(
                  item.icon,
                  color: Theme.of(context).colorScheme.primary,
                  size: 22,
                ),
              ),
              title: Text(item.title),
              subtitle: Text(
                item.subtitle,
                style: Theme.of(context).textTheme.bodySmall,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => context.push(item.route),
            ),
          );
        },
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../providers/dashboard/dashboard_provider.dart';
import '../../providers/auth/auth_provider.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/utils/currency_formatter.dart';
import '../../../core/utils/date_formatter.dart';

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dashboardAsync = ref.watch(dashboardProvider);
    final authState = ref.watch(authStateProvider);
    final userName = authState.maybeWhen(
      authenticated: (user) => user.name,
      orElse: () => 'Pengguna',
    );

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('${DateFormatter.getGreeting()}, $userName'),
            Text(
              DateFormatter.formatFullDate(DateTime.now()),
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.sync),
            onPressed: () => context.go('/sync'),
          ),
          IconButton(
            icon: const Icon(Icons.settings_outlined),
            onPressed: () => context.go('/settings'),
          ),
        ],
      ),
      body: dashboardAsync.when(
        data: (data) => _buildContent(context, ref, data),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (_, __) => _buildContent(context, ref, null),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.go('/kasir'),
        icon: const Icon(Icons.point_of_sale),
        label: const Text('Kasir'),
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: 0,
        onDestinationSelected: (index) {
          final routes = [
            '/dashboard',
            '/kasir',
            '/products',
            '/sales',
            '/more',
          ];
          if (index < routes.length) {
            context.go(routes[index]);
          }
        },
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home_outlined), label: 'Beranda'),
          NavigationDestination(icon: Icon(Icons.point_of_sale_outlined), label: 'Kasir'),
          NavigationDestination(icon: Icon(Icons.inventory_2_outlined), label: 'Produk'),
          NavigationDestination(icon: Icon(Icons.receipt_long_outlined), label: 'Penjualan'),
          NavigationDestination(icon: Icon(Icons.more_horiz), label: 'Lainnya'),
        ],
      ),
    );
  }

  Widget _buildContent(BuildContext context, WidgetRef ref, data) {
    return RefreshIndicator(
      onRefresh: () async => ref.invalidate(dashboardProvider),
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _buildSummaryCards(context, data),
          const SizedBox(height: 16),
          _buildQuickMenu(context),
          const SizedBox(height: 16),
          _buildInfoCards(context, ref),
        ],
      ),
    );
  }

  Widget _buildSummaryCards(BuildContext context, data) {
    final todaySales = data?.todaySales ?? 0;
    final transactions = data?.todayTransactions ?? 0;
    final totalProducts = data?.totalProducts ?? 0;
    final lowStock = data?.lowStockProducts ?? 0;

    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 12,
      crossAxisSpacing: 12,
      childAspectRatio: 1.5,
      children: [
        _SummaryCard(
          title: 'Penjualan Hari Ini',
          value: CurrencyFormatter.format(todaySales),
          icon: Icons.trending_up,
          color: AppColors.primary,
        ),
        _SummaryCard(
          title: 'Transaksi',
          value: transactions.toString(),
          icon: Icons.receipt_long,
          color: AppColors.secondary,
        ),
        _SummaryCard(
          title: 'Total Produk',
          value: totalProducts.toString(),
          icon: Icons.inventory_2,
          color: AppColors.tertiary,
        ),
        _SummaryCard(
          title: 'Stok Menipis',
          value: lowStock.toString(),
          icon: Icons.warning_amber_rounded,
          color: AppColors.error,
        ),
      ],
    );
  }

  Widget _buildQuickMenu(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Menu Cepat',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    )),
            const SizedBox(height: 16),
            Wrap(
              spacing: 12,
              runSpacing: 12,
              children: [
                _QuickMenuItem(
                  icon: Icons.add_shopping_cart,
                  label: 'Pembelian',
                  onTap: () => context.go('/purchases/add'),
                ),
                _QuickMenuItem(
                  icon: Icons.assignment_return,
                  label: 'Retur',
                  onTap: () => context.go('/returns/add'),
                ),
                _QuickMenuItem(
                  icon: Icons.people_outline,
                  label: 'Pelanggan',
                  onTap: () => context.go('/customers'),
                ),
                _QuickMenuItem(
                  icon: Icons.local_shipping_outlined,
                  label: 'Supplier',
                  onTap: () => context.go('/suppliers'),
                ),
                _QuickMenuItem(
                  icon: Icons.category_outlined,
                  label: 'Kategori',
                  onTap: () => context.go('/categories'),
                ),
                _QuickMenuItem(
                  icon: Icons.assessment_outlined,
                  label: 'Laporan',
                  onTap: () => context.go('/reports'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoCards(BuildContext context, WidgetRef ref) {
    return Column(
      children: [
        Card(
          child: ListTile(
            leading: const Icon(Icons.monetization_on_outlined),
            title: const Text('Kas Hari Ini'),
            trailing: Text(
              CurrencyFormatter.format(0),
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
          ),
        ),
        const SizedBox(height: 8),
        Card(
          child: ListTile(
            leading: const Icon(Icons.shield_outlined),
            title: const Text('Shift Kasir'),
            subtitle: const Text('Belum ada shift aktif'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.go('/shifts'),
          ),
        ),
      ],
    );
  }
}

class _SummaryCard extends StatelessWidget {
  final String title;
  final String value;
  final IconData icon;
  final Color color;

  const _SummaryCard({
    required this.title,
    required this.value,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(title, style: Theme.of(context).textTheme.bodySmall),
                Icon(icon, color: color, size: 20),
              ],
            ),
            Text(
              value,
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: color,
                  ),
            ),
          ],
        ),
      ),
    );
  }
}

class _QuickMenuItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _QuickMenuItem({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 100,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.primaryContainer.withValues(alpha: 0.5),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: Theme.of(context).colorScheme.primary),
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: Theme.of(context).textTheme.labelSmall,
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

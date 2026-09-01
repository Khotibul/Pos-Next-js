import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../providers/dashboard/dashboard_provider.dart';
import '../../providers/auth/auth_provider.dart';
import '../../providers/shift/shift_provider.dart';
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
    final userId = authState.maybeWhen(
      authenticated: (user) => user.id,
      orElse: () => '',
    );
    final shiftAsync =
        userId.isEmpty ? null : ref.watch(activeShiftProvider(userId));
    final shift = shiftAsync?.valueOrNull;
    final data = dashboardAsync.valueOrNull;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Dashboard'),
        automaticallyImplyLeading: false,
        actions: [
          IconButton(
            tooltip: 'Sinkronisasi',
            icon: const Icon(Icons.sync_outlined),
            onPressed: () => context.push('/sync'),
          ),
          IconButton(
            tooltip: 'Pengaturan',
            icon: const Icon(Icons.settings_outlined),
            onPressed: () => context.push('/settings'),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push('/kasir'),
        icon: const Icon(Icons.point_of_sale),
        label: const Text('Kasir'),
      ),
      body: LayoutBuilder(
        builder: (context, constraints) {
          final isWide = constraints.maxWidth >= 900;

          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(dashboardProvider),
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                _buildGreeting(context, userName, shift),
                const SizedBox(height: 16),
                isWide
                    ? Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(
                            flex: 3,
                            child: _buildOmzetHero(context, data),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            flex: 2,
                            child: _buildStatChips(context, data),
                          ),
                        ],
                      )
                    : Column(
                        children: [
                          _buildOmzetHero(context, data),
                          const SizedBox(height: 12),
                          _buildStatChips(context, data),
                        ],
                      ),
                const SizedBox(height: 20),
                _buildSectionTitle(context, 'Menu Cepat'),
                const SizedBox(height: 10),
                _buildQuickMenu(context),
                const SizedBox(height: 20),
                _buildSectionTitle(context, 'Status Toko'),
                const SizedBox(height: 10),
                _buildShiftCard(context, shift),
                const SizedBox(height: 96),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildGreeting(BuildContext context, String userName, shift) {
    return Row(
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(14),
          child: Image.asset(
            'assets/images/logo_launcher.png',
            width: 46,
            height: 46,
            fit: BoxFit.cover,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '${DateFormatter.getGreeting()},',
                style: Theme.of(context).textTheme.bodySmall,
              ),
              Text(
                userName,
                style: Theme.of(context)
                    .textTheme
                    .titleMedium
                    ?.copyWith(fontWeight: FontWeight.bold),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.primaryContainer.withValues(alpha: 0.5),
            borderRadius: BorderRadius.circular(20),
          ),
          child: Text(
            DateFormatter.formatDate(DateTime.now()),
            style: Theme.of(context).textTheme.labelSmall,
          ),
        ),
      ],
    );
  }

  Widget _buildOmzetHero(BuildContext context, data) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            Theme.of(context).colorScheme.primary,
            Theme.of(context).colorScheme.tertiary,
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.35),
            blurRadius: 16,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.trending_up, color: Colors.white70, size: 18),
              const SizedBox(width: 6),
              Text(
                'Omset Hari Ini',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: Colors.white70,
                    ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          FittedBox(
            fit: BoxFit.scaleDown,
            child: Text(
              CurrencyFormatter.format(data?.todaySales ?? 0),
              style: Theme.of(context).textTheme.headlineLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
            ),
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.18),
              borderRadius: BorderRadius.circular(30),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.receipt_long, size: 14, color: Colors.white),
                const SizedBox(width: 6),
                Text(
                  '${data?.todayTransactions ?? 0} transaksi',
                  style: Theme.of(context)
                      .textTheme
                      .labelMedium
                      ?.copyWith(color: Colors.white),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatChips(BuildContext context, data) {
    final stats = [
      (
        Icons.inventory_2_outlined,
        'Produk',
        (data?.totalProducts ?? 0).toString(),
        Colors.blue,
      ),
      (
        Icons.warning_amber_rounded,
        'Stok Menipis',
        (data?.lowStockProducts ?? 0).toString(),
        Colors.orange,
      ),
      (
        Icons.monetization_on_outlined,
        'Kas Hari Ini',
        CurrencyFormatter.format(data?.cashInHand ?? 0),
        Colors.green,
      ),
    ];

    return LayoutBuilder(
      builder: (context, constraints) {
        final isRow = constraints.maxWidth >= 500;
        final children = stats.map(
          (s) {
            final (icon, label, value, color) = s;
            return Container(
              width: isRow ? null : double.infinity,
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.surfaceContainerLow,
                borderRadius: BorderRadius.circular(18),
              ),
              child: Row(
                mainAxisSize: isRow ? MainAxisSize.min : MainAxisSize.max,
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: color.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(icon, size: 20, color: color),
                  ),
                  const SizedBox(width: 10),
                  Flexible(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          label,
                          style: Theme.of(context).textTheme.bodySmall,
                          overflow: TextOverflow.ellipsis,
                        ),
                        FittedBox(
                          fit: BoxFit.scaleDown,
                          child: Text(
                            value,
                            style: Theme.of(context)
                                .textTheme
                                .titleSmall
                                ?.copyWith(fontWeight: FontWeight.bold),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            );
          },
        ).toList();

        if (isRow) {
          return Row(
            children: [
              for (final child in children)
                Expanded(child: Padding(padding: const EdgeInsets.all(2), child: child)),
            ],
          );
        }
        return Column(children: children);
      },
    );
  }

  Widget _buildSectionTitle(BuildContext context, String text) {
    return Text(
      text,
      style: Theme.of(context)
          .textTheme
          .titleMedium
          ?.copyWith(fontWeight: FontWeight.bold),
    );
  }

  Widget _buildQuickMenu(BuildContext context) {
    final menus = [
      (
        Icons.add_shopping_cart,
        'Pembelian',
        Colors.teal,
        '/purchases',
      ),
      (
        Icons.assignment_return_outlined,
        'Retur',
        Colors.deepOrange,
        '/returns',
      ),
      (
        Icons.people_outline,
        'Pelanggan',
        Colors.indigo,
        '/customers',
      ),
      (
        Icons.local_shipping_outlined,
        'Supplier',
        Colors.purple,
        '/suppliers',
      ),
      (
        Icons.category_outlined,
        'Kategori',
        Colors.pink,
        '/categories',
      ),
      (
        Icons.assessment_outlined,
        'Laporan',
        Colors.green,
        '/reports',
      ),
    ];

    return LayoutBuilder(
      builder: (context, constraints) {
        final crossAxisCount = constraints.maxWidth >= 600 ? 6 : 4;
        return GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: crossAxisCount,
            mainAxisSpacing: 12,
            crossAxisSpacing: 12,
            childAspectRatio: 0.95,
          ),
          itemCount: menus.length,
          itemBuilder: (context, i) {
            final (icon, label, color, route) = menus[i];
            return InkWell(
              onTap: () => context.push(route),
              borderRadius: BorderRadius.circular(18),
              child: Container(
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.surfaceContainerLow,
                  borderRadius: BorderRadius.circular(18),
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: color.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Icon(icon, color: color, size: 24),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      label,
                      style: Theme.of(context).textTheme.labelMedium,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildShiftCard(BuildContext context, shift) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerLow,
        borderRadius: BorderRadius.circular(18),
      ),
      child: ListTile(
        contentPadding: EdgeInsets.zero,
        leading: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: (shift == null ? Colors.grey : Colors.green).withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(
            Icons.shield_outlined,
            size: 22,
            color: shift == null ? Colors.grey : Colors.green,
          ),
        ),
        title: const Text(
          'Shift Kasir',
          style: TextStyle(fontWeight: FontWeight.w600),
        ),
        subtitle: Text(
          shift == null
              ? 'Belum ada shift aktif'
              : 'Shift aktif sejak ${DateFormatter.formatTime(shift.openedAt)}',
          style: Theme.of(context).textTheme.bodySmall,
        ),
        trailing: const Icon(Icons.chevron_right),
        onTap: () => context.push('/shifts'),
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/role_permissions.dart';
import '../../core/theme/app_colors.dart';
import '../../core/utils/responsive_helper.dart';
import '../providers/auth/auth_provider.dart';

class MainShell extends ConsumerWidget {
  final Widget child;

  const MainShell({super.key, required this.child});

  static const List<({String route, IconData icon, IconData selectedIcon, String label})>
      _destinations = [
    (
      route: '/dashboard',
      icon: Icons.home_outlined,
      selectedIcon: Icons.home,
      label: 'Dashboard',
    ),
    (
      route: '/kasir',
      icon: Icons.point_of_sale_outlined,
      selectedIcon: Icons.point_of_sale,
      label: 'Kasir',
    ),
    (
      route: '/sales',
      icon: Icons.receipt_long_outlined,
      selectedIcon: Icons.receipt_long,
      label: 'Penjualan',
    ),
    (
      route: '/products',
      icon: Icons.inventory_2_outlined,
      selectedIcon: Icons.inventory_2,
      label: 'Produk',
    ),
    (
      route: '/more',
      icon: Icons.more_horiz,
      selectedIcon: Icons.more_horiz,
      label: 'Lainnya',
    ),
  ];

  int _currentIndex(String location, List<({String route, IconData icon, IconData selectedIcon, String label})> destinations) {
    for (int i = 0; i < destinations.length; i++) {
      if (location == destinations[i].route ||
          location.startsWith('${destinations[i].route}/')) {
        return i;
      }
    }
    return 0;
  }

  void _navigate(BuildContext context, String location, int index, List<({String route, IconData icon, IconData selectedIcon, String label})> destinations) {
    final target = destinations[index].route;
    if (location != target) {
      context.go(target);
    }
  }

  Widget _buildNavigationBar(
    BuildContext context,
    String location,
    int index,
    List<({String route, IconData icon, IconData selectedIcon, String label})> destinations,
  ) {
    return NavigationBar(
      selectedIndex: index,
      onDestinationSelected: (i) => _navigate(context, location, i, destinations),
      destinations: [
        for (final destination in destinations)
          NavigationDestination(
            icon: Icon(destination.icon),
            selectedIcon: Icon(destination.selectedIcon),
            label: destination.label,
          ),
      ],
    );
  }

  Widget _buildScrollableNavigationRail(
    BuildContext context,
    String location,
    int index,
    double viewportHeight,
    List<({String route, IconData icon, IconData selectedIcon, String label})> destinations,
  ) {
    const destinationExtent = 72.0;
    final minimumContentHeight = destinations.length * destinationExtent;
    final contentHeight = viewportHeight < minimumContentHeight
        ? minimumContentHeight
        : viewportHeight;

    return Container(
      color: AppColors.sidebar,
      width: 72,
      child: SingleChildScrollView(
        child: SizedBox(
          height: contentHeight,
          child: NavigationRail(
            backgroundColor: Colors.transparent,
            minWidth: 72,
            groupAlignment: -1,
            labelType: NavigationRailLabelType.none,
            selectedIndex: index,
            onDestinationSelected: (i) => _navigate(context, location, i, destinations),
            indicatorColor: const Color(0xFF1E3A8A),
            selectedIconTheme: const IconThemeData(color: Colors.white, size: 22),
            unselectedIconTheme: const IconThemeData(color: Color(0xFF94A3C8), size: 22),
            selectedLabelTextStyle: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600),
            unselectedLabelTextStyle: const TextStyle(color: Color(0xFF94A3C8), fontSize: 11),
            destinations: [
              for (final destination in destinations)
                NavigationRailDestination(
                  icon: Tooltip(
                    message: destination.label,
                    child: Icon(destination.icon),
                  ),
                  selectedIcon: Tooltip(
                    message: destination.label,
                    child: Icon(destination.selectedIcon),
                  ),
                  label: Text(destination.label),
                ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final role = ref.watch(authStateProvider).maybeWhen(
          authenticated: (user) => user.role,
          orElse: () => null,
        );
    final destinations = _destinations
        .where((d) => RolePermissions.canAccessRoute(role, d.route))
        .toList();
    // Fallback minimal agar tab bar tidak kosong sama sekali.
    final effectiveDestinations = destinations.isNotEmpty
        ? destinations
        : _destinations.where((d) => d.route == '/dashboard').toList();

    final location = GoRouterState.of(context).uri.path;
    final index = _currentIndex(location, effectiveDestinations);
    // Jika route aktif disembunyikan dari role → tetap tampilkan tab pertama.
    final safeIndex = index < effectiveDestinations.length ? index : 0;

    return LayoutBuilder(
      builder: (context, constraints) {
        final useNavigationRail = constraints.maxWidth >=
            ResponsiveHelper.compactWidthBreakpoint;

        return Scaffold(
          backgroundColor: AppColors.background,
          body: SafeArea(
            top: false,
            bottom: false,
            child: useNavigationRail
                ? Row(
                    children: [
                      _buildScrollableNavigationRail(
                        context,
                        location,
                        safeIndex,
                        MediaQuery.of(context).size.height,
                        effectiveDestinations,
                      ),
                      Expanded(child: child),
                    ],
                  )
                : child,
          ),
          bottomNavigationBar: useNavigationRail
              ? null
              : _buildNavigationBar(context, location, safeIndex, effectiveDestinations),
        );
      },
    );
  }
}

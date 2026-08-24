import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class MainShell extends StatelessWidget {
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

  int _currentIndex(String location) {
    for (int i = 0; i < _destinations.length; i++) {
      if (location == _destinations[i].route ||
          location.startsWith('${_destinations[i].route}/')) {
        return i;
      }
    }
    return 0;
  }

  @override
  Widget build(BuildContext context) {
    final location = GoRouterState.of(context).uri.path;
    final index = _currentIndex(location);

    return Scaffold(
      body: SafeArea(child: child),
      bottomNavigationBar: NavigationBar(
        selectedIndex: index,
        onDestinationSelected: (i) {
          final target = _destinations[i].route;
          if (location != target) {
            context.go(target);
          }
        },
        destinations: [
          for (final d in _destinations)
            NavigationDestination(
              icon: Icon(d.icon),
              selectedIcon: Icon(d.selectedIcon),
              label: d.label,
            ),
        ],
      ),
    );
  }
}

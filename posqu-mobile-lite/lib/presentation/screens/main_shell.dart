import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_colors.dart';
import '../../core/utils/responsive_helper.dart';

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

  void _navigate(BuildContext context, String location, int index) {
    final target = _destinations[index].route;
    if (location != target) {
      context.go(target);
    }
  }

  Widget _buildNavigationBar(
    BuildContext context,
    String location,
    int index,
  ) {
    return NavigationBar(
      selectedIndex: index,
      onDestinationSelected: (i) => _navigate(context, location, i),
      destinations: [
        for (final destination in _destinations)
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
  ) {
    const destinationExtent = 72.0;
    final minimumContentHeight = _destinations.length * destinationExtent;
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
            onDestinationSelected: (i) => _navigate(context, location, i),
            indicatorColor: const Color(0xFF1E3A8A),
            selectedIconTheme: const IconThemeData(color: Colors.white, size: 22),
            unselectedIconTheme: const IconThemeData(color: Color(0xFF94A3C8), size: 22),
            selectedLabelTextStyle: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600),
            unselectedLabelTextStyle: const TextStyle(color: Color(0xFF94A3C8), fontSize: 11),
            destinations: [
              for (final destination in _destinations)
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
  Widget build(BuildContext context) {
    final location = GoRouterState.of(context).uri.path;
    final index = _currentIndex(location);

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
                        index,
                        MediaQuery.of(context).size.height,
                      ),
                      Expanded(child: child),
                    ],
                  )
                : child,
          ),
          bottomNavigationBar: useNavigationRail
              ? null
              : _buildNavigationBar(context, location, index),
        );
      },
    );
  }
}

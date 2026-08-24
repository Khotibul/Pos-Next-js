import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../providers/auth/auth_provider.dart';
import '../screens/splash_screen.dart';
import '../screens/login_screen.dart';
import '../screens/main_shell.dart';
import '../screens/more/more_screen.dart';
import '../screens/dashboard/dashboard_screen.dart';
import '../screens/kasir/kasir_screen.dart';
import '../screens/product/product_list_screen.dart';
import '../screens/product/product_form_screen.dart';
import '../screens/category/category_list_screen.dart';
import '../screens/category/category_form_screen.dart';
import '../screens/supplier/supplier_list_screen.dart';
import '../screens/supplier/supplier_form_screen.dart';
import '../screens/customer/customer_list_screen.dart';
import '../screens/customer/customer_form_screen.dart';
import '../screens/purchase/purchase_list_screen.dart';
import '../screens/purchase/purchase_form_screen.dart';
import '../screens/sale/sale_list_screen.dart';
import '../screens/sale/sale_detail_screen.dart';
import '../screens/return/return_list_screen.dart';
import '../screens/return/return_form_screen.dart';
import '../screens/shift/shift_screen.dart';
import '../screens/cash/cash_screen.dart';
import '../screens/report/report_screen.dart';
import '../screens/setting/setting_screen.dart';
import '../screens/setting/printer_setting_screen.dart';
import '../screens/sync/sync_screen.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authStateProvider);

  final router = GoRouter(
    initialLocation: '/splash',
    debugLogDiagnostics: true,
    redirect: (context, state) {
      final isAuthRoute = state.matchedLocation == '/login';
      final isSplash = state.matchedLocation == '/splash';

      if (isSplash) {
        return authState.map(
          initial: (_) => null,
          loading: (_) => null,
          authenticated: (_) => '/dashboard',
          unauthenticated: (_) => '/login',
          error: (_) => '/login',
        );
      }

      final isLoggedIn = authState.maybeWhen(
        authenticated: (_) => true,
        orElse: () => false,
      );

      if (!isLoggedIn && !isAuthRoute) return '/login';
      if (isLoggedIn && isAuthRoute) return '/dashboard';

      return null;
    },
    routes: [
      GoRoute(
        path: '/splash',
        builder: (context, state) => const SplashScreen(),
      ),
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
      ),
      ShellRoute(
        builder: (context, state, child) => MainShell(child: child),
        routes: [
          GoRoute(
            path: '/dashboard',
            builder: (context, state) => const DashboardScreen(),
          ),
          GoRoute(
            path: '/kasir',
            builder: (context, state) => const KasirScreen(),
          ),
          GoRoute(
            path: '/more',
            builder: (context, state) => const MoreScreen(),
          ),
          GoRoute(
            path: '/products',
            builder: (context, state) => const ProductListScreen(),
            routes: [
              GoRoute(
                path: 'add',
                builder: (context, state) => const ProductFormScreen(),
              ),
              GoRoute(
                path: 'edit/:id',
                builder: (context, state) => ProductFormScreen(
                  productId: state.pathParameters['id'] ?? '',
                ),
              ),
            ],
          ),
          GoRoute(
            path: '/categories',
            builder: (context, state) => const CategoryListScreen(),
            routes: [
              GoRoute(
                path: 'add',
                builder: (context, state) => const CategoryFormScreen(),
              ),
              GoRoute(
                path: 'edit/:id',
                builder: (context, state) => CategoryFormScreen(
                  categoryId: state.pathParameters['id'] ?? '',
                ),
              ),
            ],
          ),
          GoRoute(
            path: '/suppliers',
            builder: (context, state) => const SupplierListScreen(),
            routes: [
              GoRoute(
                path: 'add',
                builder: (context, state) => const SupplierFormScreen(),
              ),
              GoRoute(
                path: 'edit/:id',
                builder: (context, state) => SupplierFormScreen(
                  supplierId: state.pathParameters['id'] ?? '',
                ),
              ),
            ],
          ),
          GoRoute(
            path: '/customers',
            builder: (context, state) => const CustomerListScreen(),
            routes: [
              GoRoute(
                path: 'add',
                builder: (context, state) => const CustomerFormScreen(),
              ),
              GoRoute(
                path: 'edit/:id',
                builder: (context, state) => CustomerFormScreen(
                  customerId: state.pathParameters['id'] ?? '',
                ),
              ),
            ],
          ),
          GoRoute(
            path: '/purchases',
            builder: (context, state) => const PurchaseListScreen(),
            routes: [
              GoRoute(
                path: 'add',
                builder: (context, state) => const PurchaseFormScreen(),
              ),
            ],
          ),
          GoRoute(
            path: '/sales',
            builder: (context, state) => const SaleListScreen(),
            routes: [
              GoRoute(
                path: ':id',
                builder: (context, state) => SaleDetailScreen(
                  saleId: state.pathParameters['id'] ?? '',
                ),
              ),
            ],
          ),
          GoRoute(
            path: '/returns',
            builder: (context, state) => const ReturnListScreen(),
            routes: [
              GoRoute(
                path: 'add',
                builder: (context, state) => const ReturnFormScreen(),
              ),
            ],
          ),
          GoRoute(
            path: '/shifts',
            builder: (context, state) => const ShiftScreen(),
          ),
          GoRoute(
            path: '/cash',
            builder: (context, state) => const CashScreen(),
          ),
          GoRoute(
            path: '/reports',
            builder: (context, state) => const ReportScreen(),
          ),
          GoRoute(
            path: '/settings',
            builder: (context, state) => const SettingScreen(),
            routes: [
              GoRoute(
                path: 'printer',
                builder: (context, state) => const PrinterSettingScreen(),
              ),
            ],
          ),
          GoRoute(
            path: '/sync',
            builder: (context, state) => const SyncScreen(),
          ),
        ],
      ),
    ],
    errorBuilder: (context, state) => Scaffold(
      body: Center(
        child: Text('Halaman tidak ditemukan: ${state.error}'),
      ),
    ),
  );

  ref.listen(authStateProvider, (_, __) {
    router.refresh();
  });

  return router;
});

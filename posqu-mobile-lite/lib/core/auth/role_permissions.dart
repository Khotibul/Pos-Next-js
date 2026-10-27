/// Mirror dari web `src/modules/rbac/defaults.ts` (DEFAULT_ROLE_PERMISSION_MATRIX).
/// Dipakai untuk gate navigasi Android sesuai role tenant asli user.
class RolePermissions {
  RolePermissions._();

  static const Set<String> _full = {
    "dashboard.read",
    "sales.read",
    "sales.write",
    "sales.delete",
    "transactions.shift.read",
    "transactions.shift.open",
    "transactions.shift.close",
    "transactions.shift.approve",
    "transactions.shift.export",
    "products.read",
    "products.write",
    "products.delete",
    "products.export",
    "products.import",
    "products.transfer",
    "products.opname",
    "products.adjustment",
    "products.price.manage",
    "products.discount.manage",
    "products.analytics.read",
    "products.barcode.read",
    "branches.read",
    "staff.read",
    "customers.read",
    "customers.write",
    "customers.delete",
    "suppliers.read",
    "suppliers.write",
    "inventory.read",
    "inventory.write",
    "reports.read",
    "settings.read",
    "settings.write",
    "billing.read",
    "receivables.read",
    "receivables.write",
    "payables.read",
    "payables.write",
  };

  static const Set<String> _cashier = {
    "dashboard.read",
    "sales.read",
    "sales.write",
    "transactions.shift.read",
    "transactions.shift.open",
    "transactions.shift.close",
    "products.read",
    "customers.read",
  };

  static const Set<String> _warehouse = {
    "dashboard.read",
    "branches.read",
    "transactions.shift.read",
    "transactions.shift.open",
    "transactions.shift.close",
    "products.read",
    "products.write",
    "products.transfer",
    "products.adjustment",
    "inventory.read",
    "inventory.write",
  };

  static const Set<String> _accountant = {
    "dashboard.read",
    "sales.read",
    "transactions.shift.read",
    "transactions.shift.open",
    "transactions.shift.close",
    "reports.read",
    "products.read",
    "customers.read",
    "suppliers.read",
    "billing.read",
    "receivables.read",
    "receivables.write",
    "payables.read",
    "payables.write",
  };

  static const Set<String> _branchManager = {
    "dashboard.read",
    "sales.read",
    "sales.write",
    "transactions.shift.read",
    "transactions.shift.open",
    "transactions.shift.close",
    "transactions.shift.approve",
    "branches.read",
    "products.read",
    "products.write",
    "customers.read",
    "customers.write",
    "suppliers.read",
    "suppliers.write",
    "inventory.read",
    "inventory.write",
    "reports.read",
    "settings.read",
    "receivables.read",
    "payables.read",
  };

  /// Permission milik role. Role tak dikenal (USER/null/offline lama) → full
  /// agar tidak menutup fitur user lama.
  static Set<String> permissionsFor(String? role) {
    switch (role?.trim().toUpperCase()) {
      case 'CASHIER':
        return _cashier;
      case 'WAREHOUSE':
        return _warehouse;
      case 'ACCOUNTANT':
        return _accountant;
      case 'BRANCH_MANAGER':
        return _branchManager;
      default:
        return _full;
    }
  }

  static bool can(String? role, String permission) =>
      permissionsFor(role).contains(permission);

  /// Ubah harga jual di keranjang hanya untuk role manajerial.
  static bool canEditPrice(String? role) {
    final normalized = role?.trim().toUpperCase();
    return normalized == 'OWNER' ||
        normalized == 'ADMIN' ||
        normalized == 'SUPER_ADMIN';
  }

  /// Route → permission (dipetakan dari nav web di src/components/layout/nav.ts).
  /// `/settings` & `/sync` adalah pengaturan perangkat (bukan tenant) → semua role boleh.
  static const Map<String, String> routePermissions = {
    '/dashboard': 'dashboard.read',
    '/kasir': 'sales.write',
    '/sales': 'sales.read',
    '/products': 'products.read',
    '/reports': 'reports.read',
    '/shifts': 'transactions.shift.read',
    '/cash': 'billing.read',
    '/purchases': 'inventory.read',
    '/returns': 'sales.write',
    '/customers': 'customers.read',
    '/suppliers': 'suppliers.read',
    '/categories': 'products.read',
    '/settings': 'dashboard.read',
    '/sync': 'dashboard.read',
  };

  static bool canAccessRoute(String? role, String route) {
    final perm = routePermissions[route];
    if (perm == null) return true;
    return can(role, perm);
  }
}

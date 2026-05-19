import { BarChart3, Boxes, CreditCard, LayoutDashboard, Settings, ShoppingCart, Truck, Users, Warehouse, ClipboardList, Shield } from "lucide-react";
import { PERMISSIONS } from "@/lib/permissions-keys";

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, section: "main", permission: PERMISSIONS.dashboard_read },
  { href: "/sales", match: "/pos", label: "Transaksi", icon: ShoppingCart, section: "main", permission: PERMISSIONS.sales_read },
  { href: "/products", label: "Produk", icon: Boxes, section: "main", permission: PERMISSIONS.products_read },
  { href: "/reports", label: "Laporan", icon: BarChart3, section: "main", permission: PERMISSIONS.reports_read },
  { href: "/settings", label: "Pengaturan", icon: Settings, section: "main", permission: PERMISSIONS.settings_read },
  { href: "/customers", label: "Pelanggan", icon: Users, section: "more", permission: PERMISSIONS.customers_read },
  { href: "/suppliers", label: "Supplier", icon: Truck, section: "more", permission: PERMISSIONS.suppliers_read },
  { href: "/inventory", label: "Inventory", icon: Warehouse, section: "more", permission: PERMISSIONS.inventory_read },
  { href: "/purchases", label: "Pembelian", icon: ClipboardList, section: "more", permission: PERMISSIONS.inventory_read },
  { href: "/shifts", label: "Shift Kasir", icon: ClipboardList, section: "more", permission: PERMISSIONS.sales_read },
  { href: "/audit-logs", label: "Audit Log", icon: Shield, section: "more", permission: PERMISSIONS.settings_read },
  { href: "/billing", label: "Billing", icon: CreditCard, section: "more", permission: PERMISSIONS.billing_read },
  { href: "/cashier", label: "Dashboard Kasir", icon: LayoutDashboard, section: "more", permission: PERMISSIONS.sales_read },
  { href: "/super-admin", label: "Super Admin", icon: Settings, section: "more", permission: PERMISSIONS.dashboard_read, superAdminOnly: true },
] as const;

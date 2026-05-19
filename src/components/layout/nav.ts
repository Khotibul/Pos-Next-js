import { BarChart3, Boxes, CreditCard, LayoutDashboard, Settings, ShoppingCart, Truck, Users, Warehouse } from "lucide-react";
import { PERMISSIONS } from "@/lib/permissions-keys";

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, section: "main", permission: PERMISSIONS.dashboard_read },
  { href: "/pos/history", match: "/pos", label: "Transactions", icon: ShoppingCart, section: "main", permission: PERMISSIONS.sales_read },
  { href: "/products", label: "Inventory", icon: Boxes, section: "main", permission: PERMISSIONS.products_read },
  { href: "/reports", label: "Reports", icon: BarChart3, section: "main", permission: PERMISSIONS.reports_read },
  { href: "/settings", label: "Settings", icon: Settings, section: "main", permission: PERMISSIONS.settings_read },
  { href: "/customers", label: "Customers", icon: Users, section: "more", permission: PERMISSIONS.customers_read },
  { href: "/suppliers", label: "Suppliers", icon: Truck, section: "more", permission: PERMISSIONS.suppliers_read },
  { href: "/inventory", label: "Stock Ops", icon: Warehouse, section: "more", permission: PERMISSIONS.inventory_read },
  { href: "/billing", label: "Billing", icon: CreditCard, section: "more", permission: PERMISSIONS.billing_read },
  { href: "/super-admin", label: "Super Admin", icon: Settings, section: "more", permission: PERMISSIONS.dashboard_read, superAdminOnly: true },
] as const;

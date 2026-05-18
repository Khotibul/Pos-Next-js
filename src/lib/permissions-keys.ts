export const PERMISSIONS = {
  dashboard_read: "dashboard.read",
  sales_read: "sales.read",
  sales_write: "sales.write",
  sales_delete: "sales.delete",
  products_read: "products.read",
  products_write: "products.write",
  products_delete: "products.delete",
  customers_read: "customers.read",
  customers_write: "customers.write",
  customers_delete: "customers.delete",
  suppliers_read: "suppliers.read",
  suppliers_write: "suppliers.write",
  suppliers_delete: "suppliers.delete",
  inventory_read: "inventory.read",
  inventory_write: "inventory.write",
  inventory_delete: "inventory.delete",
  reports_read: "reports.read",
  settings_read: "settings.read",
  settings_write: "settings.write",
  billing_read: "billing.read",
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];


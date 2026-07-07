export type SupplierListItem = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  isActive: boolean;
  createdAt: Date;
};

export type SupplierOverview = {
  total: number;
  active: number;
  inactive: number;
};

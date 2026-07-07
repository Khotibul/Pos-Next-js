export type CustomerListItem = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  isActive: boolean;
  createdAt: Date;
};

export type CustomerOverview = {
  total: number;
  active: number;
  inactive: number;
};

export type BranchListItem = {
  id: string;
  name: string;
  code: string | null;
  categoryId: string | null;
  category: { id: string; name: string } | null;
  phone: string | null;
  address: string | null;
  isActive: boolean;
  updatedAt: Date;
};

export type BranchOverview = {
  total: number;
  active: number;
  inactive: number;
};

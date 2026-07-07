export type PlanListItem = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  currency: string;
  priceMonthly: unknown;
  trialDays: number;
  isPopular: boolean;
  isActive: boolean;
  updatedAt: Date;
};

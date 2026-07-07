export type StaffListItem = {
  id: string;
  createdAt: Date;
  user: { id: string; name: string | null; email: string | null; phone: string | null; emailVerified: Date | null };
  role: { id: string; name: string } | null;
  branch: { id: string; name: string } | null;
};

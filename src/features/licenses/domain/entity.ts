export type LicenseListItem = {
  id: string;
  serial: string;
  createdAt: Date;
  redeemedAt: Date | null;
  revokedAt: Date | null;
  expiresAt: Date | null;
  plan: { slug: string; name: string } | null;
  tenant: { id: string; name: string; slug: string } | null;
};

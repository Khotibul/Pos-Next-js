import "server-only";

import crypto from "node:crypto";

export const CACHE_TTL = {
  dashboard: Number(process.env.REDIS_CACHE_TTL_DASHBOARD ?? 60),
  products: Number(process.env.REDIS_CACHE_TTL_PRODUCTS ?? 300),
  settings: Number(process.env.REDIS_CACHE_TTL_SETTINGS ?? 600),
  permissions: Number(process.env.REDIS_CACHE_TTL_PERMISSIONS ?? 300),
  emailVerified: Number(process.env.REDIS_CACHE_TTL_EMAIL_VERIFIED ?? 300),
  tenantAccess: Number(process.env.REDIS_CACHE_TTL_TENANT_ACCESS ?? 300),
  tenantStatus: Number(process.env.REDIS_CACHE_TTL_TENANT_STATUS ?? 300),
  membership: Number(process.env.REDIS_CACHE_TTL_MEMBERSHIP ?? 300),
};

export function hashCachePart(input: unknown) {
  return crypto.createHash("sha1").update(JSON.stringify(input)).digest("hex").slice(0, 16);
}

export const cacheKeys = {
  dashboard: (tenantId: string, branchId: string | null, dateKey: string) =>
    `dashboard:tenant:${tenantId}:branch:${branchId ?? "all"}:date:${dateKey}`,
  productList: (tenantId: string, branchId: string | null, filter: unknown) =>
    `product:list:${tenantId}:${branchId ?? "all"}:${hashCachePart(filter)}`,
  productDetail: (tenantId: string, productId: string) => `product:detail:${tenantId}:${productId}`,
  productBarcode: (tenantId: string, barcode: string) => `product:barcode:${tenantId}:${barcode}`,
  productSku: (tenantId: string, sku: string) => `product:sku:${tenantId}:${sku}`,
  tenantSettings: (tenantId: string) => `tenant:settings:${tenantId}`,
  tenantSetting: (tenantId: string, key: string) => `tenant:settings:${tenantId}:${key}`,
  emailVerified: (userId: string) => `user:email-verified:${userId}`,
  tenantStatus: (tenantId: string) => `tenant:status:${tenantId}`,
  tenantMembership: (tenantId: string, userId: string) => `tenant:membership:${tenantId}:${userId}`,
  tenantAccess: (tenantId: string, userId: string) => `tenant:access:${tenantId}:${userId}`,
  permissions: (tenantId: string, userId: string) => `permissions:${tenantId}:${userId}`,
  tenantContext: (tenantId: string, userId: string) => `auth:context:${tenantId}:${userId}`,
};

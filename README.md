# POS SaaS Management System (Next.js)

Fondasi awal untuk POS SaaS multi-tenant modern berbasis Next.js App Router + Prisma + Auth.js (NextAuth).

## Konsep Utama (Updated)

- **SaaS multi-tenant**: sistem POS dapat dipakai banyak bisnis/toko.
- **Tenant isolation**: semua data bisnis terpisah berdasarkan `tenantId` (alias `businessId`).
- **Super Admin SaaS** mengelola seluruh tenant, paket langganan, invoice/pembayaran, lisensi, dan pengaturan global.
- **Owner Bisnis** mengelola cabang, produk, stok, transaksi, pegawai, laporan, pelanggan, serta role/permission internal.

## Roles & Access Control

Role user yang dipakai:

1. **Super Admin SaaS** (flag `User.isSuperAdmin = true` → akses `/super-admin/*`)
2. **Owner Bisnis** (`OWNER`)
3. **Admin Toko** (`ADMIN`)
4. **Kasir** (`CASHIER`)
5. **Gudang** (`WAREHOUSE`)
6. **Akuntan** (`ACCOUNTANT`)
7. **Manager Cabang** (`BRANCH_MANAGER`)

RBAC berbasis **permission per fitur** (default di-seed saat registrasi tenant & seed demo):

- `dashboard.read`
- `sales.*` (POS/transactions)
- `products.*` (inventory produk)
- `customers.*`, `suppliers.*`
- `inventory.*` (stock ops)
- `reports.read`
- `settings.*` (termasuk printer/struk)
- `billing.read`

Setiap page/action melakukan:

- `requirePermission(...)` untuk cek permission
- `requireActiveTenant()` untuk blokir aksi tulis/transaksi ketika tenant `SUSPENDED/EXPIRED` atau trial habis

## Requirements

- Node.js 20+
- PostgreSQL (default) atau MySQL

## Setup (Local)

1. Install dependency:
   - `npm install`
2. Siapkan env:
   - `copy .env.example .env`
   - Sesuaikan `DATABASE_URL` dan `AUTH_SECRET`
   - (Opsional Google popup auth) isi `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
3. Generate Prisma client:
   - PostgreSQL: `npm run prisma:generate`
   - MySQL: `npm run prisma:generate:mysql`
4. Buat database & migrate:
   - PostgreSQL: `npm run prisma:migrate`
   - MySQL: `npm run prisma:migrate:mysql`
5. Seed data demo:
   - `npm run db:seed` (atau `npm run db:seed:mysql` jika Anda generate client MySQL)
6. Jalankan dev server:
   - `npm run dev`

## Notes

- Prisma schema PostgreSQL ada di `src/prisma/schema.prisma`, MySQL ada di `src/prisma/schema.mysql.prisma`.
- Halaman awal: `/`, `/pricing`, `/register`, `/login`.
- Area dashboard (sementara placeholder): `/dashboard`, `/pos`, `/products`, `/inventory`, `/customers`, `/suppliers`, `/reports`, `/settings`, `/billing`.
 - Tenant switcher menggunakan cookie `active_tenant_id` via `POST /api/tenant/switch`.

## Module Pattern (Production)

Setiap modul dibuat modular agar scalable:

- **DB Models**: di Prisma schema (semua tabel bisnis wajib punya `tenantId`).
- **Validation**: Zod schema di `src/modules/<module>/validators.ts`.
- **Service**: akses DB di `src/modules/<module>/service.ts` (selalu filter `tenantId`).
- **Actions**: server actions di `src/modules/<module>/actions.ts` dengan:
  - `requirePermission(...)` (RBAC)
  - `requireActiveTenant()` (blokir tenant suspended/expired untuk aksi tulis)
  - `writeAuditLog(...)` (audit trail)
- **UI**: page App Router di `src/app/(dashboard)/...` + komponen table/form di `src/modules/<module>/components/*`.

## Demo Accounts (Seed)

Password default: `Password123!` (atau set `SEED_PASSWORD`).

- `superadmin@platform.local`
- `owner@demo-resto.local`, `admin@demo-resto.local`, `kasir@demo-resto.local`
- `owner@demo-mart.local`, `gudang@demo-mart.local`, `akuntan@demo-mart.local`, `manager@demo-mart.local`

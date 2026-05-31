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
   - (Opsional OAuth Google) isi `GOOGLE_CLIENT_ID` dan `GOOGLE_CLIENT_SECRET`
   - (Opsional verifikasi email untuk login credentials) isi `SMTP_HOST/SMTP_USER/SMTP_PASS` + `EMAIL_FROM`
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

## Setup (Neon / Production)

1. Set `DATABASE_URL` Neon (wajib SSL, contoh ada di `.env.example`)
2. Jalankan migrate + seed:
   - `npm run db:setup:neon`

Catatan:
- Gunakan `prisma migrate deploy` untuk hosted DB seperti Neon (lebih aman untuk CI/CD dibanding `migrate dev`).
- Alternatif: `npx prisma db seed` (akan memakai seed command dari `package.json`).

## Redis / Upstash (Optional Production Cache)

Redis bersifat opsional; jika env kosong aplikasi tetap berjalan tanpa crash. Untuk Vercel production, gunakan Upstash Redis:

- Set `UPSTASH_REDIS_REST_URL` dan `UPSTASH_REDIS_REST_TOKEN`
- Set TTL opsional: `REDIS_CACHE_TTL_DASHBOARD`, `REDIS_CACHE_TTL_PRODUCTS`, `REDIS_CACHE_TTL_SETTINGS`

## Google OAuth Setup (Web, Android, Desktop)

**Website (Auth.js):**
- Buat OAuth Client ID tipe **Web application** di Google Cloud Console.
- Authorized redirect URI: `https://domain-anda.com/api/auth/callback/google`.
- Set `AUTH_URL`/`NEXTAUTH_URL` ke domain production yang sama.
- Set `GOOGLE_CLIENT_ID` dan `GOOGLE_CLIENT_SECRET` di Vercel/env server.

**Android Capacitor:**
- Buat OAuth Client ID tipe **Android** dengan package name APK (`com.pospro.mobile`) dan SHA-1/SHA-256 debug/release.
- Native app mengambil `idToken`, lalu kirim ke `POST /api/mobile/auth/google`.
- Server memverifikasi `idToken` dengan `google-auth-library`; client secret tidak pernah dikirim ke Android.
- Set `NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID` dan `NEXT_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`.

**Electron Desktop:**
- Google OAuth embedded WebView bisa diblok Google. Aplikasi desktop menampilkan fallback dan menyarankan login email/password.
- Jika ingin OAuth desktop penuh, gunakan flow browser eksternal + deep link/custom protocol pada iterasi berikutnya.

Catatan: warning Self-XSS/CSP dari `accounts.google.com` atau `gstatic.com` di console Google bukan error aplikasi selama callback login berhasil.
- Set `WORKER_SECRET` untuk endpoint worker `POST /api/workers/process-queue`

Redis dipakai untuk dashboard cache, product/barcode lookup cache, tenant settings cache, rate limiter, dan queue email/sync.

## Email Verification

- **Google OAuth**: user Google akan otomatis dianggap verified (field `User.emailVerified` di-set saat sign-in Google).
- **Email/password (Credentials)**: login diblokir sampai email diverifikasi via link.

Untuk mengirim email verifikasi, sistem menggunakan **SMTP** (lihat `.env.example`).
Rekomendasi cepat untuk Gmail:
- Aktifkan 2FA pada akun Gmail
- Buat **App Password**
- Set `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`, `SMTP_SECURE=true`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`

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

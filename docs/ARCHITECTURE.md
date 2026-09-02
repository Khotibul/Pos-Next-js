# Architecture - POS SaaS

## Struktur Folder `src/`

```
src/
├── app/                # Next.js App Router (pages, layouts, api routes)
├── components/         # Shared UI components (ui/, layout/, pos/, forms/)
├── modules/            # ✅ PATTERN UTAMA - Module Pattern (production)
│   └── <module>/
│       ├── actions.ts      # Server actions (RBAC + audit)
│       ├── service.ts      # DB access (filter tenantId)
│       ├── validators.ts   # Zod schemas
│       └── components/     # UI khusus modul
├── lib/                # Utilities inti (auth, db, cache, guards, license)
├── shared/             # Shared server utilities (cache, guards, validators)
├── prisma/             # Prisma schemas (PostgreSQL + MySQL)
├── config/             # Config global
├── types/              # Global TypeScript types
└── features/           # ⚠️ DEPRECATED - jangan tambah fitur baru di sini
                        #    Gunakan `modules/` sebagai sumber utama.
                        #    `features/` akan di-merge ke `modules/` bertahap.
```

### Aturan Penempatan Kode

| Jenis Kode | Taruh di |
|---|---|
| Halaman / Route | `src/app/(dashboard)/...` |
| Komponen UI generik | `src/components/ui/` |
| Logic bisnis (produk, transaksi, dsb) | `src/modules/<nama>/` |
| Helper auth / DB / cache | `src/lib/` atau `src/shared/server/` |
| Tipe global | `src/types/` |

### Folder Kosong / Legacy

- `src/legacy/` - dihapus (legacy Vite)
- `src/store/`, `src/providers/`, `src/hooks/`, `src/utils/` - kosong, gunakan `src/shared/` dan `src/lib/`
- `src/features/` - duplikat `modules/`, jangan dipakai untuk fitur baru

### Build Outputs (di-ignore)

- `.next/`, `.next-desktop/`, `dist-electron/`, `dist-desktop/`, `dist-desktop-build/`
- `.npm-cache/`, `src/.npm-cache/`
- `posqu-mobile-lite/.dart_tool/`, `build/`, `android/.gradle/`

### Scripts Penting

- `npm run dev` - Next.js web
- `npm run desktop:dev` - Electron + Next
- `npm run desktop:build` - Build desktop (production URL: posqupro.co-id.id)
- `npm run android:build:debug` / `release` - Build APK
- `npm run prisma:generate` / `migrate` - Database

Lihat `package.json` untuk daftar lengkap.

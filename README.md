# Aplikasi Kasir & Manajemen Stok

Aplikasi fullstack untuk kasir dan manajemen stok barang dengan multi-cabang, offline-first, role-based access control, dan Android WebView wrapper.

**Stack:** Next.js 16 (App Router, React 19) + Prisma 5 + Tailwind CSS + TypeScript + Android WebView

## Fitur

- **Multi-Cabang** — data produk, user, transaksi terisolasi per cabang; SUPER_ADMIN kelola semua
- **Autentikasi & RBAC** — login JWT (httpOnly cookie), refresh token, role SUPER_ADMIN/ADMIN/KASIR
- **Dashboard** (admin) — ringkasan penjualan, pendapatan, total laba, produk terlaris, stok menipis
- **Produk** (admin) — CRUD produk dengan SKU unik per cabang, harga jual, harga beli (modal), stok minimal
- **Stok Masuk** (admin) — catat barang masuk, stok otomatis bertambah
- **Stok Keluar** (admin) — catat barang keluar (rusak/kadaluarsa), stok otomatis berkurang
- **Kasir (POS)** — pilih produk, atur jumlah, bayar, cetak struk; pencarian debounced; offline-ready
- **Riwayat** — riwayat transaksi dengan detail item, void transaksi, laba per hari
- **Offline-First** — Service Worker (cache-first + stale-while-revalidate), IndexedDB cache (50 LRU), antrian transaksi offline, auth persistensi
- **Android** — WebView wrapper, SwipeRefresh, update checker via `/api/version`, back confirm dialog
- **Monitoring** — Prometheus metrics, structured JSON logging, alerting rules, Grafana dashboard

## Tech Stack

| Teknologi | Keterangan |
|---|---|
| Next.js 16 | App Router, React 19, TypeScript, Turbopack |
| Prisma 5 | ORM, SQLite (dev) / PostgreSQL (prod - Neon) |
| Tailwind CSS | Styling |
| Zod | Validasi input |
| Lucide React | Ikon |
| React Hot Toast | Notifikasi |
| prom-client | Prometheus metrics |
| Service Worker | Cache static + API GET |
| IndexedDB | API cache, product catalog, pending transactions |
| Android (Java) | WebView wrapper |
| k6 | Load testing |

## Prasyarat

- Node.js 20+
- npm
- Android Studio (untuk build APK)

## Cara Menjalankan

```bash
npm install
cp .env.example .env  # edit sesuai kebutuhan
npx prisma db push
npm run db:seed
npm run dev -H 127.0.0.1
```

Buka `http://localhost:3000`.

### Login Default

| Username | Password | Role |
|----------|----------|------|
| superadmin | super123 | SUPER_ADMIN |
| admin | admin123 | ADMIN |
| kasir | kasir123 | KASIR |

## Perintah Penting

```bash
npm run dev             # development server
npm run build           # production build
npm start               # production server
npm test                # unit test
npm run db:seed         # seed data contoh
npx prisma studio       # database browser
cd android && ./gradlew assembleDebug  # build APK
```

## Struktur Proyek

```
kasir-app/
├── android/                         # Android WebView wrapper
│   └── app/src/main/java/com/kasir/app/MainActivity.java
├── prisma/
│   ├── schema.prisma                # Model database (SQLite)
│   ├── schema.postgres.prisma       # Model database (PostgreSQL)
│   ├── migrations/                   # Migrasi Prisma
│   └── seed.mjs                     # Seed data
├── public/
│   └── sw.js                        # Service Worker
├── src/
│   ├── app/
│   │   ├── api/                     # API routes (REST)
│   │   │   ├── auth/                # login/logout/refresh/me
│   │   │   ├── cabang/              # multi-cabang CRUD
│   │   │   ├── products/
│   │   │   ├── stock-in/
│   │   │   ├── stock-out/
│   │   │   ├── transactions/
│   │   │   ├── users/
│   │   │   ├── dashboard/
│   │   │   ├── health/
│   │   │   ├── metrics/
│   │   │   ├── version/
│   │   │   ├── ready/
│   │   │   └── cleanup/
│   │   ├── cabang/                  # Halaman kelola cabang
│   │   ├── login/
│   │   ├── products/
│   │   │   ├── create/
│   │   │   └── [id]/edit/
│   │   ├── stock-in/
│   │   ├── stock-out/
│   │   ├── transactions/
│   │   │   ├── page.tsx             # POS kasir
│   │   │   └── history/
│   │   ├── users/
│   │   ├── error.tsx                # Error boundary (root)
│   │   ├── layout.tsx               # Layout dengan bottom navbar (role-aware)
│   │   └── page.tsx                 # Dashboard
│   ├── lib/
│   │   ├── services/                # Business logic layer
│   │   │   ├── auth.service.ts
│   │   │   ├── product.service.ts
│   │   │   ├── transaction.service.ts
│   │   │   ├── stock.service.ts
│   │   │   ├── user.service.ts
│   │   │   ├── cabang.service.ts
│   │   │   └── dashboard.service.ts
│   │   ├── api-client.ts            # Typed fetch wrapper + IndexedDB fallback
│   │   ├── api-handler.ts           # withApiHandler wrapper
│   │   ├── auth.ts                  # JWT helpers (server)
│   │   ├── auth-edge.ts             # JWT verify untuk edge runtime
│   │   ├── auth-context.tsx         # React context + localStorage persist
│   │   ├── config.ts                # Env config (validated)
│   │   ├── db.ts                    # IndexedDB helpers
│   │   ├── errors.ts                # Typed error hierarchy
│   │   ├── logger.ts                # Structured JSON logging
│   │   ├── metrics.ts               # Prometheus metrics
│   │   ├── request.ts               # Request parsing helpers
│   │   ├── sw-register.ts           # Service Worker registration
│   │   ├── sync.ts                  # Offline transaction flush
│   │   ├── utils.ts                 # formatRupiah, formatDate
│   │   └── use-online-status.ts     # Online status hook
│   ├── components/
│   │   ├── Pagination.tsx
│   │   ├── ProductForm.tsx          # Shared form (create/edit)
│   │   └── OfflineBanner.tsx        # Online/offline indicator
│   ├── proxy.ts                     # Auth + RBAC + security headers (Next.js 16)
│   └── types/
│       └── lucide-react.d.ts
├── monitoring/
│   ├── alerting-rules.yml           # Prometheus alert rules
│   └── grafana-dashboard.json       # Grafana dashboard template
├── tests/
│   ├── api.test.mjs                 # Integration test
│   └── load-test.js                 # k6 load test script
├── .env.example
├── next.config.ts
├── tailwind.config.ts
├── package.json
└── vercel.json
```

## API Endpoint

| Method | Endpoint | Role | Deskripsi |
|---|---|---|---|
| POST | /api/auth/login | Public | Login |
| POST | /api/auth/logout | All | Logout |
| POST | /api/auth/refresh | All | Refresh token |
| GET | /api/auth/me | All | Current user |
| GET | /api/health | Public | Health check |
| GET | /api/ready | Public | Readiness |
| GET | /api/version | Public | Version info |
| GET | /api/metrics | Admin | Prometheus metrics |
| GET/POST | /api/cabang | SUPER_ADMIN | Kelola cabang |
| GET/PUT/DELETE | /api/cabang/:id | SUPER_ADMIN | Detail/update/hapus cabang |
| GET | /api/dashboard | Admin | Dashboard data |
| GET | /api/products | All | List produk |
| POST | /api/products | Admin | Buat produk |
| GET/PUT/DELETE | /api/products/:id | Admin* | Detail/update/hapus produk |
| GET/POST | /api/stock-in | Admin | Riwayat/tambah stok masuk |
| GET/POST | /api/stock-out | Admin | Riwayat/tambah stok keluar |
| GET/POST | /api/transactions | All | Riwayat/buat transaksi |
| PUT | /api/transactions/:id/void | Admin | Void transaksi |
| GET/POST | /api/users | Admin | Kelola user |
| GET/PUT/DELETE | /api/users/:id | Admin | Detail/update/hapus user |

\* GET produk bisa diakses semua role; PUT/DELETE hanya admin/SUPER_ADMIN.

## Deploy ke Vercel

1. Buat database PostgreSQL gratis di [Neon](https://neon.tech)
2. Ganti schema: `cp prisma/schema.postgres.prisma prisma/schema.prisma`
3. Push repo ke GitHub
4. Hubungkan ke Vercel
5. Set environment variables:
   - `DATABASE_URL` — PostgreSQL connection string
   - `JWT_SECRET` — minimal 16 karakter
   - `ADMIN_USERNAME` — admin login (default: admin)
   - `ADMIN_PASSWORD` — admin password (default: admin123)
   - `CORS_ORIGIN` — origin untuk CORS (default: http://localhost:3000)
   - `ALLOWED_HOST` — host untuk vercel.json (default: kasir-app-lake.vercel.app)
6. Build command: `npx prisma generate && npx prisma migrate deploy && next build`
7. Deploy

### Build APK Android

1. Clone repo
2. Update `APP_URL` dan `ALLOWED_HOST` di `android/.../MainActivity.java`
3. Jalankan: `cd android && ./gradlew assembleDebug`
4. APK: `android/app/build/outputs/apk/debug/`

Atau gunakan GitHub Actions: push ke `main` dengan perubahan di `android/**` akan trigger build otomatis.

## Lisensi

MIT

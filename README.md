# Aplikasi Kasir & Manajemen Stok

Aplikasi fullstack untuk kasir dan manajemen stok barang (keluar/masuk) dengan autentikasi JWT, role-based access control (admin/kasir), dan monitoring produksi.

**Stack:** Next.js 16 (App Router, React 19) + Prisma 5 + Tailwind CSS + TypeScript

## Fitur

- **Autentikasi & RBAC** — login JWT (httpOnly cookie), password PBKDF2, role ADMIN/KASIR
- **Dashboard** (admin) — ringkasan penjualan, pendapatan, stok menipis
- **Produk** (admin) — CRUD produk dengan SKU unik, harga, stok minimal
- **Stok Masuk** (admin) — catat barang masuk, stok otomatis bertambah
- **Stok Keluar** (admin) — catat barang keluar (rusak/kadaluarsa), stok otomatis berkurang
- **Kasir (POS)** — pilih produk, atur jumlah, bayar, cetak struk
- **Riwayat** — riwayat transaksi dengan detail item
- **Kelola Pengguna** (admin) — buat/edit/hapus user
- **Monitoring** — Prometheus metrics, structured JSON logging, alerting rules, Grafana dashboard

## Tech Stack

| Teknologi | Keterangan |
|---|---|
| Next.js 16 | App Router, React 19, TypeScript, Turbopack |
| Prisma 5 | ORM, SQLite (dev) / PostgreSQL (prod) |
| Tailwind CSS | Styling |
| Zod | Validasi input |
| Lucide React | Ikon |
| React Hot Toast | Notifikasi |
| prom-client | Prometheus metrics |
| k6 | Load testing |

## Prasyarat

- Node.js 20+
- npm

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
| admin | admin123 | ADMIN |
| kasir | kasir123 | KASIR |

## Perintah Penting

```bash
npm run dev           # development server
npm run build         # production build
npm start             # production server
npm test              # unit test (16 test)
npm run db:seed       # seed data contoh
npx prisma studio     # database browser
```

## Struktur Proyek

```
kasir-app/
├── prisma/
│   ├── schema.prisma              # Model database (SQLite)
│   └── seed.mjs                   # Seed data
├── src/
│   ├── app/
│   │   ├── api/                   # API routes
│   │   │   ├── auth/              # login/logout
│   │   │   ├── products/
│   │   │   ├── stock-in/
│   │   │   ├── stock-out/
│   │   │   ├── transactions/
│   │   │   ├── dashboard/
│   │   │   ├── users/
│   │   │   ├── health/
│   │   │   └── metrics/
│   │   ├── login/
│   │   ├── products/
│   │   ├── stock-in/
│   │   ├── stock-out/
│   │   ├── transactions/
│   │   ├── users/
│   │   ├── layout.tsx             # Layout dengan sidebar (role-aware)
│   │   └── page.tsx               # Dashboard
│   ├── lib/
│   │   ├── services/              # Business logic layer
│   │   ├── auth.ts                # JWT helpers
│   │   ├── api-client.ts          # Typed fetch wrapper
│   │   ├── config.ts              # Env config (validated)
│   │   ├── errors.ts              # Typed error hierarchy
│   │   ├── logger.ts              # Structured JSON logging
│   │   ├── metrics.ts             # Prometheus metrics
│   │   ├── middleware-helpers.ts  # Shared auth helpers
│   │   └── utils.ts               # formatRupiah, formatDate
│   ├── components/
│   │   └── Pagination.tsx
│   ├── middleware.ts              # Auth + RBAC + security headers
│   └── types/
│       └── lucide-react.d.ts
├── monitoring/
│   ├── alerting-rules.yml         # Prometheus alert rules
│   └── grafana-dashboard.json     # Grafana dashboard template
├── tests/
│   ├── api.test.mjs               # Integration test (16 test)
│   └── load-test.js               # k6 load test script
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
| GET | /api/health | Public | Health check |
| GET | /api/metrics | Admin | Prometheus metrics |
| GET | /api/dashboard | Admin | Dashboard data |
| GET | /api/products | All | List produk |
| POST | /api/products | Admin | Buat produk |
| GET/PUT/DELETE | /api/products/:id | Admin*/All | Detail/update/hapus produk |
| GET | /api/stock-in | Admin | Riwayat stok masuk |
| POST | /api/stock-in | Admin | Catat stok masuk |
| GET | /api/stock-out | Admin | Riwayat stok keluar |
| POST | /api/stock-out | Admin | Catat stok keluar |
| GET | /api/transactions | All | Riwayat transaksi |
| POST | /api/transactions | All | Buat transaksi |
| GET/POST | /api/users | Admin | Kelola user |
| GET/PUT/DELETE | /api/users/:id | Admin | Detail/update/hapus user |

\* GET produk bisa diakses oleh semua role, PUT/DELETE hanya admin.

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
6. Build command otomatis: `npx prisma generate && npx prisma db push && next build`
7. Deploy

## Lisensi

MIT

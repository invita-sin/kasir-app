# PRD — Aplikasi Kasir & Manajemen Stok

**Versi:** 2.0
**Status:** Final
**Tanggal:** 4 Juli 2026

---

## 1. Ringkasan Eksekutif

Aplikasi kasir berbasis web yang mencatat transaksi penjualan sekaligus mengelola stok barang (keluar/masuk). Dilengkapi autentikasi JWT dengan role-based access control (admin/kasir), monitoring (Prometheus metrics + structured logging), dan siap deploy ke Vercel.

## 2. Tujuan & Sasaran

- Mencatat transaksi penjualan dengan antarmuka POS yang cepat
- Memantau stok barang secara real-time
- Mencatat barang masuk dan keluar (rusak/hilang)
- Memberi peringatan stok menipis
- Menyediakan laporan dashboard dan riwayat transaksi
- **Autentikasi multi-user dengan role admin & kasir**
- **Monitoring produksi (metrics, logging, alerting)**

## 3. Target Pengguna

- Admin toko — mengelola produk, stok, pengguna, lihat laporan
- Kasir — hanya melakukan transaksi penjualan

## 4. Fitur

### 4.1 Autentikasi & RBAC
- Login/logout dengan JWT (httpOnly cookie)
- Password di-hash dengan PBKDF2 + pepper
- Dua role: ADMIN (full akses) dan KASIR (transaksi saja)
- Middleware otomatis redirect KASIR dari halaman admin
- Manajemen pengguna (CRUD) oleh admin

### 4.2 Dashboard (Admin only)
- Ringkasan jumlah produk, penjualan, pendapatan
- Daftar penjualan terbaru
- Alert stok menipis
- Aktivitas stok masuk/keluar terbaru

### 4.3 Manajemen Produk (Admin only)
- CRUD produk (nama, SKU, harga, deskripsi, minimal stok)
- Pencarian produk
- Indikator visual stok menipis
- SKU unik

### 4.4 Stok Masuk (Admin only)
- Catat barang masuk dengan jumlah dan catatan
- Otomatis menambah stok produk
- Riwayat stok masuk

### 4.5 Stok Keluar (Admin only)
- Catat barang keluar (rusak, hilang, kadaluarsa)
- Validasi stok tersedia
- Otomatis mengurangi stok produk
- Riwayat stok keluar

### 4.6 Kasir (POS)
- Grid produk yang bisa dipilih
- Keranjang belanja real-time
- Atur kuantitas (tambah/kurang/hapus)
- Hitung total otomatis
- Cetak struk (print)
- Validasi stok sebelum checkout

### 4.7 Riwayat Transaksi
- Daftar semua transaksi penjualan
- Detail item per transaksi (expandable)

### 4.8 Monitoring & Observability
- Prometheus metrics (`/api/metrics`) — request count, latency, error rate
- Structured JSON logging dengan requestId
- Alerting rules (high error rate, high latency, low stock, no recent sales)
- Grafana dashboard template

## 5. Alur Data

```
Barang Masuk → Tambah Stok Produk
Penjualan    → Kurangi Stok Produk + Catat Transaksi
Barang Keluar → Kurangi Stok Produk (non-penjualan)
```

## 6. Tech Stack

| Layer | Teknologi |
|---|---|---|
| Frontend | Next.js 16 (App Router, React 19, Tailwind CSS) |
| Backend | Next.js API Routes (REST) |
| Database | SQLite (dev) / PostgreSQL (prod) |
| ORM | Prisma 5 |
| Auth | JWT (Web Crypto API) + PBKDF2 |
| Validation | Zod |
| Icons | Lucide React |
| Notifikasi | React Hot Toast |
| Monitoring | Prometheus (prom-client), Structured Logging |
| Testing | Node Test Runner |
| Load Testing | k6 |
| Deployment | Vercel |

## 7. Skema Database

### User
| Field | Tipe | Keterangan |
|---|---|---|
| id | String (cuid) | PK |
| username | String (unique) | Username login |
| password | String | Hash PBKDF2 (base64url) |
| name | String | Nama pengguna |
| role | Enum (ADMIN/KASIR) | Role akses |
| createdAt | DateTime | |

### Product
| Field | Tipe | Keterangan |
|---|---|---|
| id | String (cuid) | PK |
| name | String | Nama produk |
| sku | String (unique) | Kode SKU |
| description | String? | Deskripsi |
| price | Float | Harga jual |
| stock | Int | Stok saat ini |
| minStock | Int | Minimal stok (alert) |
| createdAt | DateTime | |
| updatedAt | DateTime | |

### StockIn
| Field | Tipe | Keterangan |
|---|---|---|
| id | String (cuid) | PK |
| productId | String | FK ke Product (cascade) |
| quantity | Int | Jumlah masuk |
| note | String? | Catatan |
| createdAt | DateTime | |

### StockOut
| Field | Tipe | Keterangan |
|---|---|---|
| id | String (cuid) | PK |
| productId | String | FK ke Product (cascade) |
| quantity | Int | Jumlah keluar |
| note | String? | Alasan |
| createdAt | DateTime | |

### Sale
| Field | Tipe | Keterangan |
|---|---|---|
| id | String (cuid) | PK |
| total | Float | Total harga |
| createdAt | DateTime | |

### SaleItem
| Field | Tipe | Keterangan |
|---|---|---|
| id | String (cuid) | PK |
| saleId | String | FK ke Sale (cascade) |
| productId | String | FK ke Product |
| quantity | Int | Jumlah |
| price | Float | Harga per unit saat transaksi |

## 8. API Endpoint

| Method | Endpoint | Role | Deskripsi |
|---|---|---|---|
| POST | /api/auth/login | Public | Login, dapat JWT cookie |
| POST | /api/auth/logout | All | Logout, hapus cookie |
| GET | /api/health | Public | Health check |
| GET | /api/metrics | Admin | Prometheus metrics |
| GET | /api/dashboard | Admin | Data dashboard |
| GET | /api/products | All | List produk (?search=&page=&limit=&all=) |
| POST | /api/products | Admin | Buat produk |
| GET | /api/products/:id | All | Detail produk |
| PUT | /api/products/:id | Admin | Update produk |
| DELETE | /api/products/:id | Admin | Hapus produk |
| GET | /api/stock-in | Admin | Riwayat stok masuk |
| POST | /api/stock-in | Admin | Catat stok masuk |
| GET | /api/stock-out | Admin | Riwayat stok keluar |
| POST | /api/stock-out | Admin | Catat stok keluar |
| GET | /api/transactions | All | Riwayat transaksi |
| POST | /api/transactions | All | Buat transaksi |
| GET | /api/users | Admin | List pengguna |
| POST | /api/users | Admin | Buat pengguna |
| GET | /api/users/:id | Admin | Detail pengguna |
| PUT | /api/users/:id | Admin | Update pengguna |
| DELETE | /api/users/:id | Admin | Hapus pengguna |

## 9. Halaman

| Route | Halaman | Role |
|---|---|---|
| /login | Login | Public |
| / | Dashboard | Admin |
| /products | Daftar produk | Admin |
| /products/create | Tambah produk | Admin |
| /products/:id/edit | Edit produk | Admin |
| /stock-in | Stok masuk | Admin |
| /stock-out | Stok keluar | Admin |
| /users | Kelola pengguna | Admin |
| /transactions | Kasir (POS) | All |
| /transactions/history | Riwayat transaksi | All |

## 10. Kriteria Sukses

- [x] CRUD produk berfungsi
- [x] Stok otomatis bertambah saat barang masuk
- [x] Stok otomatis berkurang saat penjualan
- [x] Stok otomatis berkurang saat stok keluar (non-penjualan)
- [x] Validasi stok cukup sebelum transaksi
- [x] Peringatan stok menipis
- [x] Cetak struk
- [x] Dashboard menampilkan ringkasan
- [x] Pencarian produk
- [x] Autentikasi JWT + RBAC (admin/kasir)
- [x] Manajemen pengguna (CRUD oleh admin)
- [x] Validasi input client-side + server-side (Zod)
- [x] Prometheus metrics
- [x] Structured JSON logging
- [x] Alerting rules
- [x] Grafana dashboard
- [x] Unit test (16 test, 16/16 pass)
- [x] Load test (k6)
- [x] Deployable di Vercel

## 11. Pengembangan Selanjutnya (v2)

- Multi-toko
- Laporan laba rugi
- Export PDF/Excel
- Manajemen kategori produk
- Diskon & promo
- Barcode scanning
- Mode offline / PWA

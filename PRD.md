# PRD — Aplikasi Kasir & Manajemen Stok

**Versi:** 1.1.0
**Status:** Final
**Tanggal:** 8 Juli 2026

---

## 1. Ringkasan Eksekutif

Aplikasi kasir berbasis web dengan offline-first, multi-cabang, multi-role (SUPER_ADMIN/ADMIN/KASIR), autentikasi JWT, monitoring Prometheus, dan Android WebView wrapper. Siap deploy ke Vercel + Neon PostgreSQL.

## 2. Tujuan & Sasaran

- Mencatat transaksi penjualan dengan antarmuka POS yang cepat
- Memantau stok barang secara real-time
- Mendukung multi-cabang dengan data terpisah
- Mencatat barang masuk dan keluar (rusak/hilang)
- Memberi peringatan stok menipis
- Menyediakan laporan dashboard, laba, dan riwayat transaksi
- **Autentikasi multi-user dengan role SUPER_ADMIN, ADMIN & KASIR**
- **Offline-first: Service Worker, IndexedDB cache, antrian transaksi offline**
- **Android WebView wrapper dengan update checker**
- **Monitoring produksi (metrics, logging, alerting)**

## 3. Target Pengguna

- SUPER_ADMIN — mengelola semua cabang, pengguna, produk
- ADMIN toko — mengelola produk, stok, pengguna di cabangnya, lihat laporan
- KASIR — hanya melakukan transaksi penjualan

## 4. Fitur

### 4.1 Autentikasi & RBAC
- Login/logout dengan JWT (httpOnly cookie), refresh token otomatis
- Password di-hash dengan PBKDF2 + pepper
- Tiga role: SUPER_ADMIN (full akses seluruh cabang), ADMIN (akses per cabang), KASIR (transaksi saja)
- Middleware otomatis redirect KASIR dari halaman admin
- Manajemen pengguna (CRUD) — SUPER_ADMIN kelola semua, ADMIN kelola cabangnya
- Auth persistensi ke localStorage untuk offline

### 4.2 Multi-Cabang
- Setiap cabang memiliki produk, user, dan transaksi sendiri
- SUPER_ADMIN bisa membuat/mengedit/menghapus cabang
- ADMIN terikat ke satu cabang
- Nama aplikasi, alamat, telepon per cabang (tampil di struk)

### 4.3 Dashboard (Admin / SUPER_ADMIN)
- Ringkasan jumlah produk, penjualan, pendapatan, total laba
- Daftar penjualan terbaru
- Produk terlaris
- Alert stok menipis
- Aktifitas stok masuk/keluar terbaru

### 4.4 Manajemen Produk (Admin / SUPER_ADMIN)
- CRUD produk (nama, SKU, harga, harga beli/modal, deskripsi, minimal stok)
- Pencarian produk
- Indikator visual stok menipis
- SKU unik per cabang
- Harga beli (cost) untuk perhitungan laba

### 4.5 Stok Masuk (Admin / SUPER_ADMIN)
- Catat barang masuk dengan jumlah dan catatan
- Otomatis menambah stok produk
- Riwayat stok masuk

### 4.6 Stok Keluar (Admin / SUPER_ADMIN)
- Catat barang keluar (rusak, hilang, kadaluarsa)
- Validasi stok tersedia
- Otomatis mengurangi stok produk
- Riwayat stok keluar

### 4.7 Kasir (POS)
- Grid produk yang bisa dipilih (dengan pencarian debounced)
- Keranjang belanja real-time
- Atur kuantitas (tambah/kurang/hapus)
- Hitung total otomatis
- Cetak struk (print)
- Validasi stok sebelum checkout
- Mode offline: cari dari produk yang sudah di-cache

### 4.8 Riwayat Transaksi
- Daftar semua transaksi penjualan
- Detail item per transaksi (expandable)
- Void transaksi dengan pengembalian stok
- Laba per hari

### 4.9 Offline-First
- Service Worker: cache-first untuk static, stale-while-revalidate untuk API critical
- IndexedDB: generic API cache (50-entry LRU), product catalog, pending transaction queue
- Auth persistensi: localStorage menyimpan user data
- Online status hook + OfflineBanner component
- Antrian transaksi offline: otomatis di-flush saat online

### 4.10 Android WebView
- WebView wrapper dengan SwipeRefresh, progress bar, network observer
- Update checker via `/api/version` dengan dialog download APK
- Back button confirm dialog
- Hanya allow traffic ke ALLOWED_HOST

### 4.11 Monitoring & Observability
- Prometheus metrics (`/api/metrics`) — request count, latency, error rate
- Structured JSON logging dengan requestId
- Alerting rules (high error rate, high latency, low stock, no recent sales)
- Grafana dashboard template

### 4.12 Error Handling
- `withApiHandler` wrapper untuk boilerplate try/catch/metrics
- Hierarki error: ApiError → NotFoundError, ValidationError, UnauthorizedError, ForbiddenError, ConflictError
- React Error Boundaries (root + cashier)
- Client-side error mapping (getErrorMessage)

## 5. Alur Data

```
Barang Masuk → Tambah Stok Produk
Penjualan    → Kurangi Stok Produk + Catat Transaksi + Copy Cost ke SaleItem
Barang Keluar → Kurangi Stok Produk (non-penjualan)
Void         → Kembalikan Stok Produk + Tandai Status "voided"
```

## 6. Tech Stack

| Layer | Teknologi |
|---|---|---|
| Frontend | Next.js 16 (App Router, React 19, Tailwind CSS) |
| Backend | Next.js API Routes (REST) + Proxy |
| Database | SQLite (dev) / PostgreSQL (prod, Neon) |
| ORM | Prisma 5 |
| Auth | JWT (Web Crypto API) + PBKDF2 |
| Validation | Zod |
| Icons | Lucide React |
| Notifikasi | React Hot Toast |
| Offline | Service Worker, IndexedDB |
| Monitoring | Prometheus (prom-client), Structured Logging |
| Testing | Node Test Runner |
| Load Testing | k6 |
| Deployment | Vercel + Neon PostgreSQL |
| Mobile | Android WebView (Java) |

## 7. Skema Database

### Cabang
| Field | Tipe | Keterangan |
|---|---|---|
| id | String (cuid) | PK |
| name | String | Nama cabang |
| appName | String | Nama aplikasi untuk tampilan |
| address | String? | Alamat |
| phone | String? | Telepon |
| createdAt | DateTime | |

### User
| Field | Tipe | Keterangan |
|---|---|---|
| id | String (cuid) | PK |
| username | String (unique) | Username login |
| password | String | Hash PBKDF2 (base64url) |
| name | String | Nama pengguna |
| role | Enum (SUPER_ADMIN/ADMIN/KASIR) | Role akses |
| cabangId | String? | FK ke Cabang (nullable untuk SUPER_ADMIN) |
| createdAt | DateTime | |

### Product
| Field | Tipe | Keterangan |
|---|---|---|
| id | String (cuid) | PK |
| name | String | Nama produk |
| sku | String (unique per cabang) | Kode SKU |
| description | String? | Deskripsi |
| price | Float | Harga jual |
| cost | Float | Harga beli (modal), default 0 |
| stock | Int | Stok saat ini |
| minStock | Int | Minimal stok (alert) |
| cabangId | String | FK ke Cabang |
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
| status | Enum (active/voided) | Status transaksi |
| voidedAt | DateTime? | Waktu void |
| voidedReason | String? | Alasan void |
| createdAt | DateTime | |

### SaleItem
| Field | Tipe | Keterangan |
|---|---|---|
| id | String (cuid) | PK |
| saleId | String | FK ke Sale (cascade) |
| productId | String | FK ke Product |
| quantity | Int | Jumlah |
| price | Float | Harga per unit saat transaksi |
| cost | Float | Harga beli per unit saat transaksi |

## 8. API Endpoint

| Method | Endpoint | Role | Deskripsi |
|---|---|---|---|
| POST | /api/auth/login | Public | Login, dapat JWT cookie |
| POST | /api/auth/logout | All | Logout, hapus cookie |
| POST | /api/auth/refresh | All | Refresh JWT token |
| GET | /api/auth/me | All | Get current user |
| GET | /api/health | Public | Health check |
| GET | /api/ready | Public | Readiness check |
| GET | /api/version | Public | Version + release notes |
| GET | /api/metrics | Admin | Prometheus metrics |
| GET | /api/cleanup | Admin | Cleanup stale data |
| GET | /api/dashboard | Admin | Data dashboard |
| GET/POST | /api/cabang | SUPER_ADMIN | Kelola cabang |
| GET/PUT/DELETE | /api/cabang/:id | SUPER_ADMIN | Detail/update/hapus cabang |
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
| PUT | /api/transactions/:id/void | Admin | Void transaksi |
| GET/POST | /api/users | Admin | Kelola pengguna |
| GET/PUT/DELETE | /api/users/:id | Admin | Detail/update/hapus user |

## 9. Halaman

| Route | Halaman | Role |
|---|---|---|
| /login | Login | Public |
| / | Dashboard | Admin / SUPER_ADMIN |
| /cabang | Kelola Cabang | SUPER_ADMIN |
| /products | Daftar produk | Admin / SUPER_ADMIN |
| /products/create | Tambah produk | Admin / SUPER_ADMIN |
| /products/:id/edit | Edit produk | Admin / SUPER_ADMIN |
| /stock-in | Stok masuk | Admin / SUPER_ADMIN |
| /stock-out | Stok keluar | Admin / SUPER_ADMIN |
| /users | Kelola pengguna | Admin / SUPER_ADMIN |
| /transactions | Kasir (POS) | All |
| /transactions/history | Riwayat transaksi | All |

## 10. Kriteria Sukses

- [x] CRUD produk berfungsi
- [x] Multi-cabang dengan data terisolasi
- [x] Stok otomatis bertambah saat barang masuk
- [x] Stok otomatis berkurang saat penjualan
- [x] Stok otomatis berkurang saat stok keluar (non-penjualan)
- [x] Stok kembali saat void transaksi
- [x] Validasi stok cukup sebelum transaksi
- [x] Peringatan stok menipis
- [x] Cetak struk
- [x] Dashboard menampilkan ringkasan + total laba
- [x] Pencarian produk (debounced)
- [x] Autentikasi JWT + RBAC (SUPER_ADMIN/ADMIN/KASIR)
- [x] Manajemen pengguna (CRUD oleh admin, terikat cabang)
- [x] Validasi input client-side + server-side (Zod)
- [x] Offline-first: Service Worker, IndexedDB cache, antrian offline
- [x] Android WebView dengan update checker
- [x] Cost / harga beli untuk perhitungan laba
- [x] Void transaksi dengan pengembalian stok
- [x] Prometheus metrics
- [x] Structured JSON logging
- [x] Alerting rules
- [x] Grafana dashboard
- [x] Error Boundaries + withApiHandler wrapper
- [x] Deployable di Vercel + Neon PostgreSQL

## 11. Pengembangan Selanjutnya

- Export PDF/Excel
- Manajemen kategori produk
- Diskon & promo
- Barcode scanning
- Multiple payment methods
- Laporan laba-rugi per periode
- Dark mode toggle
- Push notification untuk stok menipis

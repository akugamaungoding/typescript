# Standard FE with Direct SQL / API Routes (Single Project Architecture)

Implementasi referensi standar untuk fitur **Master Produk (`PRODUCT_MST`)** dan **Transaksi Produk (`PRODUCT_TRX`)** tanpa backend Express terpisah. Frontend Next.js menangani UI sekaligus menjalankan akses database SQL Server secara langsung melalui Next.js API Routes (`src/pages/api/...`) dan Prisma ORM.

---

## 1. Struktur Folder
```text
standard-fe_w_sql/
├── database/
│   └── schema.sql                # DDL script tabel SQL Server (PK, FK, Check, Constraints)
├── prisma/
│   └── schema.prisma             # Definisi model Prisma ORM (SQL Server)
├── src/
│   ├── components/
│   │   └── Layout.tsx            # Layout navigasi & container
│   ├── lib/
│   │   └── db.ts                 # PrismaClient singleton instance
│   ├── pages/
│   │   ├── _app.tsx
│   │   ├── index.tsx             # Redirect ke /products
│   │   ├── api/
│   │   │   ├── products/
│   │   │   │   ├── index.ts      # GET (list & paging), POST (create)
│   │   │   │   ├── active.ts     # GET (active products for dropdown)
│   │   │   │   └── [id]/
│   │   │   │       ├── index.ts  # GET (detail), PUT (update)
│   │   │   │       └── status.ts # PUT (toggle active status / soft delete)
│   │   │   └── transactions/
│   │   │       ├── index.ts      # GET (list & paging), POST (create & atomic stock update)
│   │   │       └── [id].ts       # GET (detail transaction)
│   │   ├── products/
│   │   │   └── index.tsx         # UI Master Produk (List, Modal Tambah, Edit, Detail, Toggle Status)
│   │   └── transactions/
│   │       └── index.tsx         # UI Transaksi (List, Modal Tambah, Preview Qty * Price, Detail)
│   ├── styles/
│   │   └── globals.css
│   └── utils/
│       └── api.ts                # Fetch wrapper internal ke /api/...
├── .env.example
├── .env.local
├── package.json
├── tailwind.config.js
└── tsconfig.json
```

---

## 2. Cara Menjalankan

### A. Setup Database
Jalankan file [database/schema.sql](file:///c:/DATA/tanggungan/help/UTPE/standard-fe_w_sql/database/schema.sql) pada SQL Server Anda.

### B. Menjalankan Aplikasi
1. Masuk ke folder project:
   ```bash
   cd standard-fe_w_sql
   ```
2. Salin `.env.example` ke `.env.local` dan sesuaikan `DATABASE_URL`:
   ```env
   DATABASE_URL="sqlserver://localhost:1433;database=satria;user=sa;password=YourPassword123;trustServerCertificate=true"
   ```
3. Install dependensi & generate Prisma client:
   ```bash
   npm install
   npx prisma generate
   ```
4. Jalankan aplikasi Next.js:
   ```bash
   npm run dev
   ```
   Aplikasi berjalan di: `http://localhost:3001` (atau port default 3000 jika dijalankan standalone).

---

## 3. Fitur Utama yang Diimplementasikan
- **Master Produk**:
  - `PRODUCT_ID` dibuat otomatis oleh SQL Server (Identity/Autoincrement).
  - Soft delete melalui kolom `IS_ACTIVE`.
  - Search (nama & deskripsi), Filter status (All, Aktif, Nonaktif), Sorting multi-kolom, Pagination server-side langsung di API Route.
  - Validasi form, modal detail, modal edit, dan konfirmasi interaktif SweetAlert2.
- **Transaksi Produk**:
  - Dropdown hanya memuat produk berstatus aktif.
  - Snapshot harga saat transaksi berlangsung (`QUANTITY * PRICE`).
  - Pengurangan stok secara atomic dan aman via transaksi database (`prisma.$transaction`).
  - Riwayat transaksi tetap tersimpan utuh meskipun produk dinonaktifkan di kemudian hari.

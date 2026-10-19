# Standard FE + BE (Separated Architecture)

Implementasi referensi standar untuk fitur **Master Produk (`PRODUCT_MST`)** dan **Transaksi Produk (`PRODUCT_TRX`)** dengan arsitektur terpisah antara Frontend (Next.js) dan Backend (Express.js + Prisma ORM + SQL Server).

---

## 1. Struktur Folder
```text
standard-fe-be/
├── database/
│   └── schema.sql                # DDL script tabel SQL Server (PK, FK, Check, Constraints)
├── backend/
│   ├── prisma/
│   │   └── schema.prisma         # Definisi model Prisma ORM (SQL Server)
│   ├── src/
│   │   ├── config/
│   │   │   └── db.ts             # PrismaClient singleton instance
│   │   ├── controllers/
│   │   │   ├── ProductController.ts      # Logic CRUD, soft delete, filter, sort, pagination
│   │   │   └── TransactionController.ts  # Logic transaksi, validasi stok, auto amount
│   │   ├── routes/
│   │   │   └── api.ts            # Endpoint route Express
│   │   └── server.ts             # Server entry point
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
└── frontend/
    ├── src/
    │   ├── components/
    │   │   └── Layout.tsx        # Layout navigasi & container
    │   ├── pages/
    │   │   ├── _app.tsx
    │   │   ├── index.tsx         # Redirect ke /products
    │   │   ├── products/
    │   │   │   └── index.tsx     # UI Master Produk (List, Modal Tambah, Edit, Detail, Toggle Status)
    │   │   └── transactions/
    │   │       └── index.tsx     # UI Transaksi (List, Modal Tambah, Preview Qty * Price, Detail)
    │   ├── styles/
    │   │   └── globals.css
    │   └── utils/
    │       └── api.ts            # Fetch wrapper ke Backend API
    ├── .env.local
    ├── package.json
    ├── tailwind.config.js
    └── tsconfig.json
```

---

## 2. Cara Menjalankan

### A. Setup Database
Jalankan file [database/schema.sql](file:///c:/DATA/tanggungan/help/UTPE/standard-fe-be/database/schema.sql) pada SQL Server Anda.

### B. Menjalankan Backend
1. Masuk ke folder backend:
   ```bash
   cd standard-fe-be/backend
   ```
2. Salin `.env.example` ke `.env` dan sesuaikan `DATABASE_URL`:
   ```env
   PORT=5000
   DATABASE_URL="sqlserver://localhost:1433;database=satria;user=sa;password=YourPassword123;trustServerCertificate=true"
   ```
3. Install dependensi & generate Prisma client:
   ```bash
   npm install
   npx prisma generate
   ```
4. Jalankan backend:
   ```bash
   npm run dev
   ```
   Backend berjalan di: `http://localhost:5000`

### C. Menjalankan Frontend
1. Masuk ke folder frontend:
   ```bash
   cd standard-fe-be/frontend
   ```
2. Pastikan file `.env.local` mengarah ke Backend:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:5000/api
   ```
3. Install dependensi:
   ```bash
   npm install
   ```
4. Jalankan frontend:
   ```bash
   npm run dev
   ```
   Frontend berjalan di: `http://localhost:3000`

---

## 3. Fitur Utama yang Diimplementasikan
- **Master Produk**:
  - Auto increment ID (`PRODUCT_ID`) dibuat oleh SQL Server.
  - Soft delete melalui kolom `IS_ACTIVE`.
  - Filter status (All, Aktif, Nonaktif), Search (nama & deskripsi), Sorting, Pagination server-side.
  - Modal tambah, edit, detail, dan konfirmasi aktifasi/deaktifasi.
- **Transaksi Produk**:
  - Pilihan produk hanya menampilkan produk aktif.
  - Snapshot harga diambil dari `PRODUCT_MST.PRICE` saat transaksi dibuat.
  - Perhitungan otomatis `TOTAL_AMOUNT = QUANTITY * PRICE`.
  - Validasi stok: stok tidak boleh minus, quantity harus > 0.
  - Atomic stock update menggunakan interactive transaction (`prisma.$transaction`).
  - Riwayat transaksi tetap utuh meskipun produk dinonaktifkan di kemudian hari.

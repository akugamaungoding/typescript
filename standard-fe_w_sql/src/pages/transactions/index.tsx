import React, { useEffect, useState, useCallback } from "react";
import Layout from "@/components/Layout";
import { apiFetch } from "@/utils/api";
import Swal from "sweetalert2";
import {
  Plus,
  Search,
  ArrowUpDown,
  Eye,
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
  Receipt,
} from "lucide-react";

interface ProductOption {
  product_id: number;
  product_name: string;
  price: number | string;
  stock: number;
}

interface Transaction {
  transaction_id: string;
  transaction_code: string;
  product_id: number;
  transaction_date: string;
  quantity: number;
  total_amount: number;
  created_at: string;
  product?: {
    product_id: number;
    product_name: string;
    price: number;
    is_active: boolean;
  };
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  // Search & Filters
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortBy, setSortBy] = useState("transaction_id");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Add Transaction Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeProducts, setActiveProducts] = useState<ProductOption[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<number | "">("");
  const [quantity, setQuantity] = useState<number | "">("");
  const [submitting, setSubmitting] = useState(false);

  // Detail Modal
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Selected product metadata for preview calculation
  const currentProduct = activeProducts.find(
    (p) => p.product_id === Number(selectedProductId)
  );
  const unitPrice = currentProduct ? Number(currentProduct.price) : 0;
  const numQty = typeof quantity === "number" ? quantity : 0;
  const totalCalculated = unitPrice * numQty;

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  // Fetch transaction list
  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    const query = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      search: debouncedSearch,
      sortBy,
      sortOrder,
    });

    const res = await apiFetch<Transaction[]>(`/transactions?${query.toString()}`);
    if (res.success && res.data) {
      setTransactions(res.data);
      setTotal(res.total || 0);
      setTotalPages(res.totalPages || 1);
    } else {
      Swal.fire("Error", res.message || "Gagal memuat transaksi", "error");
    }
    setLoading(false);
  }, [page, limit, debouncedSearch, sortBy, sortOrder]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Handle Sort
  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
    setPage(1);
  };

  // Open Add Transaction Modal
  const handleOpenAdd = async () => {
    setSelectedProductId("");
    setQuantity("");
    // Fetch active products
    const res = await apiFetch<ProductOption[]>("/products/active");
    if (res.success && res.data) {
      setActiveProducts(res.data);
    } else {
      Swal.fire("Peringatan", "Gagal memuat daftar produk aktif", "warning");
    }
    setIsAddModalOpen(true);
  };

  // Submit Transaction
  const handleSubmitTransaction = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProductId) {
      Swal.fire("Peringatan", "Silakan pilih produk aktif", "warning");
      return;
    }

    if (!quantity || Number(quantity) <= 0) {
      Swal.fire("Peringatan", "Jumlah quantity harus lebih besar dari 0", "warning");
      return;
    }

    if (currentProduct && Number(quantity) > currentProduct.stock) {
      Swal.fire(
        "Peringatan Stok",
        `Stok produk tidak mencukupi. Stok saat ini: ${currentProduct.stock}, diminta: ${quantity}`,
        "warning"
      );
      return;
    }

    // Confirmation dialog
    const confirm = await Swal.fire({
      title: "Konfirmasi Transaksi",
      html: `
        <div style="text-align: left; font-size: 0.9rem;">
          <p><strong>Produk:</strong> ${currentProduct?.product_name}</p>
          <p><strong>Harga Satuan:</strong> Rp ${unitPrice.toLocaleString("id-ID", { minimumFractionDigits: 2 })}</p>
          <p><strong>Quantity:</strong> ${quantity} unit</p>
          <p><strong>Total Pembayaran:</strong> Rp ${totalCalculated.toLocaleString("id-ID", { minimumFractionDigits: 2 })}</p>
        </div>
      `,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Ya, Proses Transaksi",
      cancelButtonText: "Batal",
      confirmButtonColor: "#0f766e",
    });

    if (!confirm.isConfirmed) return;

    setSubmitting(true);
    const res = await apiFetch("/transactions", {
      method: "POST",
      body: JSON.stringify({
        product_id: Number(selectedProductId),
        quantity: Number(quantity),
      }),
    });

    if (res.success) {
      Swal.fire(
        "Berhasil",
        `Transaksi berhasil diproses dengan kode: <strong>${res.data?.transaction_code}</strong>`,
        "success"
      );
      setIsAddModalOpen(false);
      fetchTransactions();
    } else {
      Swal.fire("Gagal", res.message || "Gagal memproses transaksi", "error");
    }
    setSubmitting(false);
  };

  // Open Detail
  const handleOpenDetail = (trx: Transaction) => {
    setSelectedTransaction(trx);
    setIsDetailModalOpen(true);
  };

  return (
    <Layout title="Transaksi Produk (PRODUCT_TRX)">
      {/* Top Action Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari kode transaksi atau nama produk..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent"
            />
          </div>

          {/* Add Transaction Button */}
          <button
            onClick={handleOpenAdd}
            className="flex items-center justify-center gap-2 bg-teal-700 hover:bg-teal-800 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Transaksi</span>
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-100/75 border-b border-slate-200 text-slate-600 uppercase text-xs font-bold tracking-wider">
                <th className="py-3 px-4 w-16 text-center">No</th>
                <th
                  onClick={() => handleSort("transaction_code")}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-200/60 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Kode Transaksi</span>
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </div>
                </th>
                <th className="py-3 px-4">Nama Produk</th>
                <th
                  onClick={() => handleSort("transaction_date")}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-200/60 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Tanggal Transaksi</span>
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("quantity")}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-200/60 text-center transition-colors"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Qty</span>
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("total_amount")}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-200/60 text-right transition-colors"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Total Amount (Rp)</span>
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </div>
                </th>
                <th className="py-3 px-4 text-center w-24">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
                      <span>Memuat data transaksi...</span>
                    </div>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Receipt className="w-10 h-10 text-slate-300" />
                      <span className="font-medium">Tidak ada data transaksi ditemukan</span>
                    </div>
                  </td>
                </tr>
              ) : (
                transactions.map((t, idx) => (
                  <tr
                    key={t.transaction_id}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="py-3 px-4 text-center font-medium text-slate-500">
                      {(page - 1) * limit + idx + 1}
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-teal-700">
                      {t.transaction_code}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900">
                      {t.product?.product_name || `Product ID: ${t.product_id}`}
                      {t.product && !t.product.is_active && (
                        <span className="ml-2 text-xs font-semibold px-2 py-0.5 bg-rose-50 text-rose-700 rounded-full border border-rose-200">
                          Nonaktif
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {new Date(t.transaction_date).toLocaleString("id-ID")}
                    </td>
                    <td className="py-3 px-4 text-center font-semibold text-slate-800">
                      {t.quantity}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      Rp {Number(t.total_amount).toLocaleString("id-ID", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleOpenDetail(t)}
                        title="Lihat Detail"
                        className="p-1.5 text-slate-500 hover:text-teal-600 hover:bg-teal-50 rounded-md transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div>
            Menampilkan{" "}
            <span className="font-semibold text-slate-900">
              {transactions.length > 0 ? (page - 1) * limit + 1 : 0}
            </span>{" "}
            hingga{" "}
            <span className="font-semibold text-slate-900">
              {Math.min(page * limit, total)}
            </span>{" "}
            dari <span className="font-semibold text-slate-900">{total}</span> total transaksi
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 mr-2">
              <span>Per halaman:</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="px-2 py-1 border border-slate-300 rounded bg-white text-xs"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>

            <button
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page <= 1 || loading}
              className="p-1.5 border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-medium">
              Hal {page} dari {totalPages}
            </span>
            <button
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page >= totalPages || loading}
              className="p-1.5 border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal Add Transaction */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-teal-700" />
                <span>Buat Transaksi Produk</span>
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmitTransaction} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Pilih Produk Aktif <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => {
                    setSelectedProductId(e.target.value ? Number(e.target.value) : "");
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                  required
                >
                  <option value="">-- Pilih Produk --</option>
                  {activeProducts.map((p) => (
                    <option key={p.product_id} value={p.product_id}>
                      {p.product_name} (Stok: {p.stock} | Rp {Number(p.price).toLocaleString("id-ID")})
                    </option>
                  ))}
                </select>
                {activeProducts.length === 0 && (
                  <p className="text-amber-600 text-xs mt-1">
                    Tidak ada produk aktif dengan stok tersedia.
                  </p>
                )}
              </div>

              {/* Product Info Preview */}
              {currentProduct && (
                <div className="bg-teal-50/70 border border-teal-200 rounded-lg p-3 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Harga Satuan Saat Ini:</span>
                    <span className="font-bold text-slate-900">
                      Rp {unitPrice.toLocaleString("id-ID", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Stok Tersedia:</span>
                    <span
                      className={`font-bold ${
                        currentProduct.stock <= 5 ? "text-amber-700" : "text-emerald-700"
                      }`}
                    >
                      {currentProduct.stock} unit
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Quantity Transaksi <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max={currentProduct ? currentProduct.stock : undefined}
                  value={quantity}
                  onChange={(e) =>
                    setQuantity(e.target.value === "" ? "" : parseInt(e.target.value, 10))
                  }
                  placeholder="Minimal 1"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-200"
                  required
                />
              </div>

              {/* Real-time Calculation Summary */}
              <div className="bg-slate-100 rounded-lg p-4 border border-slate-200 text-sm">
                <div className="flex justify-between items-center text-slate-600 mb-1 text-xs">
                  <span>Rumus Perhitungan:</span>
                  <span>QUANTITY &times; PRICE</span>
                </div>
                <div className="flex justify-between items-center text-base font-bold text-slate-900 pt-1 border-t border-slate-200">
                  <span>Total Amount:</span>
                  <span className="text-teal-700 text-lg">
                    Rp {totalCalculated.toLocaleString("id-ID", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-slate-200 mt-6">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-sm font-semibold transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting || !selectedProductId || !quantity}
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {submitting ? "Memproses..." : "Simpan Transaksi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detail Transaction */}
      {isDetailModalOpen && selectedTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                <Receipt className="w-5 h-5 text-teal-700" />
                <span>Detail Transaksi Produk</span>
              </h3>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold"
              >
                &times;
              </button>
            </div>

            <div className="p-6 space-y-3 text-sm">
              <div className="flex border-b border-slate-100 pb-2">
                <span className="w-40 text-slate-500 font-medium">Transaction ID:</span>
                <span className="text-slate-900 font-bold">{selectedTransaction.transaction_id}</span>
              </div>
              <div className="flex border-b border-slate-100 pb-2">
                <span className="w-40 text-slate-500 font-medium">Kode Transaksi:</span>
                <span className="text-teal-700 font-mono font-bold">{selectedTransaction.transaction_code}</span>
              </div>
              <div className="flex border-b border-slate-100 pb-2">
                <span className="w-40 text-slate-500 font-medium">Produk:</span>
                <span className="text-slate-900 font-semibold">
                  {selectedTransaction.product?.product_name || `ID ${selectedTransaction.product_id}`}
                </span>
              </div>
              <div className="flex border-b border-slate-100 pb-2">
                <span className="w-40 text-slate-500 font-medium">Quantity:</span>
                <span className="text-slate-900 font-semibold">{selectedTransaction.quantity} unit</span>
              </div>
              <div className="flex border-b border-slate-100 pb-2">
                <span className="w-40 text-slate-500 font-medium">Total Amount:</span>
                <span className="text-slate-900 font-bold text-base text-teal-700">
                  Rp {Number(selectedTransaction.total_amount).toLocaleString("id-ID", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex border-b border-slate-100 pb-2">
                <span className="w-40 text-slate-500 font-medium">Tanggal Transaksi:</span>
                <span className="text-slate-700">
                  {new Date(selectedTransaction.transaction_date).toLocaleString("id-ID")}
                </span>
              </div>
              <div className="flex pb-2">
                <span className="w-40 text-slate-500 font-medium">Waktu Dibuat:</span>
                <span className="text-slate-700">
                  {new Date(selectedTransaction.created_at).toLocaleString("id-ID")}
                </span>
              </div>
            </div>

            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-sm font-semibold transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

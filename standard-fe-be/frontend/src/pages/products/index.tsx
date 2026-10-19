import React, { useEffect, useState, useCallback } from "react";
import Layout from "@/components/Layout";
import { apiFetch } from "@/utils/api";
import Swal from "sweetalert2";
import {
  Plus,
  Search,
  ArrowUpDown,
  Eye,
  Edit2,
  Power,
  ChevronLeft,
  ChevronRight,
  Package,
} from "lucide-react";

interface Product {
  product_id: number;
  product_name: string;
  description: string | null;
  price: number | string;
  stock: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  // Search & Filters
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("product_id");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Form inputs
  const [formData, setFormData] = useState({
    product_name: "",
    description: "",
    price: "",
    stock: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  // Fetch product list
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const query = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      search: debouncedSearch,
      status: statusFilter,
      sortBy,
      sortOrder,
    });

    const res = await apiFetch<Product[]>(`/products?${query.toString()}`);
    if (res.success && res.data) {
      setProducts(res.data);
      setTotal(res.total || 0);
      setTotalPages(res.totalPages || 1);
    } else {
      Swal.fire("Error", res.message || "Gagal memuat daftar produk", "error");
    }
    setLoading(false);
  }, [page, limit, debouncedSearch, statusFilter, sortBy, sortOrder]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

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

  // Open Form Modal for Create
  const handleOpenAdd = () => {
    setFormMode("add");
    setSelectedProduct(null);
    setFormData({
      product_name: "",
      description: "",
      price: "",
      stock: "",
    });
    setFormErrors({});
    setIsFormModalOpen(true);
  };

  // Open Form Modal for Edit
  const handleOpenEdit = (p: Product) => {
    setFormMode("edit");
    setSelectedProduct(p);
    setFormData({
      product_name: p.product_name,
      description: p.description || "",
      price: p.price.toString(),
      stock: p.stock.toString(),
    });
    setFormErrors({});
    setIsFormModalOpen(true);
  };

  // Open Detail Modal
  const handleOpenDetail = (p: Product) => {
    setSelectedProduct(p);
    setIsDetailModalOpen(true);
  };

  // Validate Form
  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.product_name.trim()) {
      errors.product_name = "Nama produk wajib diisi";
    }
    if (formData.price === "" || isNaN(Number(formData.price)) || Number(formData.price) < 0) {
      errors.price = "Harga harus berupa angka dan minimal 0";
    }
    if (formData.stock === "" || isNaN(Number(formData.stock)) || Number(formData.stock) < 0) {
      errors.stock = "Stok harus berupa angka bulat dan minimal 0";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit Add / Edit
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    if (formMode === "add") {
      const res = await apiFetch("/products", {
        method: "POST",
        body: JSON.stringify({
          product_name: formData.product_name.trim(),
          description: formData.description.trim() || null,
          price: Number(formData.price),
          stock: parseInt(formData.stock, 10),
        }),
      });

      if (res.success) {
        Swal.fire("Berhasil", "Produk berhasil ditambahkan", "success");
        setIsFormModalOpen(false);
        fetchProducts();
      } else {
        Swal.fire("Gagal", res.message || "Gagal menambahkan produk", "error");
      }
    } else if (formMode === "edit" && selectedProduct) {
      const res = await apiFetch(`/products/${selectedProduct.product_id}`, {
        method: "PUT",
        body: JSON.stringify({
          product_name: formData.product_name.trim(),
          description: formData.description.trim() || null,
          price: Number(formData.price),
          stock: parseInt(formData.stock, 10),
        }),
      });

      if (res.success) {
        Swal.fire("Berhasil", "Produk berhasil diperbarui", "success");
        setIsFormModalOpen(false);
        fetchProducts();
      } else {
        Swal.fire("Gagal", res.message || "Gagal memperbarui produk", "error");
      }
    }
    setSubmitting(false);
  };

  // Toggle Active / Deactivate (Soft Delete)
  const handleToggleStatus = async (p: Product) => {
    const actionText = p.is_active ? "menonaktifkan" : "mengaktifkan";
    const confirm = await Swal.fire({
      title: "Konfirmasi",
      text: `Apakah Anda yakin ingin ${actionText} produk "${p.product_name}"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: `Ya, ${actionText}`,
      cancelButtonText: "Batal",
      confirmButtonColor: p.is_active ? "#dc2626" : "#16a34a",
    });

    if (confirm.isConfirmed) {
      const res = await apiFetch(`/products/${p.product_id}/status`, {
        method: "PUT",
        body: JSON.stringify({ is_active: !p.is_active }),
      });

      if (res.success) {
        Swal.fire(
          "Berhasil",
          `Produk berhasil di${p.is_active ? "nonaktifkan" : "aktifkan"}`,
          "success"
        );
        fetchProducts();
      } else {
        Swal.fire("Gagal", res.message || "Gagal mengubah status produk", "error");
      }
    }
  };

  return (
    <Layout title="Master Produk (PRODUCT_MST)">
      {/* Top Action Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nama atau deskripsi..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Semua Status</option>
                <option value="1">Aktif</option>
                <option value="0">Nonaktif</option>
              </select>
            </div>
          </div>

          {/* Add Button */}
          <button
            onClick={handleOpenAdd}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Produk</span>
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
                  onClick={() => handleSort("product_name")}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-200/60 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Nama Produk</span>
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </div>
                </th>
                <th className="py-3 px-4">Deskripsi</th>
                <th
                  onClick={() => handleSort("price")}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-200/60 text-right transition-colors"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Harga (Rp)</span>
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("stock")}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-200/60 text-center transition-colors"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Stok</span>
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("is_active")}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-200/60 text-center transition-colors"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Status</span>
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </div>
                </th>
                <th className="py-3 px-4 text-center w-36">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <span>Memuat data produk...</span>
                    </div>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Package className="w-10 h-10 text-slate-300" />
                      <span className="font-medium">Tidak ada data produk ditemukan</span>
                    </div>
                  </td>
                </tr>
              ) : (
                products.map((p, idx) => (
                  <tr
                    key={p.product_id}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="py-3 px-4 text-center font-medium text-slate-500">
                      {(page - 1) * limit + idx + 1}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {p.product_name}
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                      {p.description || "-"}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-slate-900">
                      Rp {Number(p.price).toLocaleString("id-ID", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-center font-medium">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          p.stock > 0
                            ? "bg-slate-100 text-slate-800"
                            : "bg-red-50 text-red-600 border border-red-200"
                        }`}
                      >
                        {p.stock}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          p.is_active
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        {p.is_active ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenDetail(p)}
                          title="Lihat Detail"
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(p)}
                          title="Edit Produk"
                          className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(p)}
                          title={p.is_active ? "Nonaktifkan" : "Aktifkan"}
                          className={`p-1.5 rounded-md transition-colors ${
                            p.is_active
                              ? "text-slate-500 hover:text-red-600 hover:bg-red-50"
                              : "text-slate-500 hover:text-emerald-600 hover:bg-emerald-50"
                          }`}
                        >
                          <Power className="w-4 h-4" />
                        </button>
                      </div>
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
              {products.length > 0 ? (page - 1) * limit + 1 : 0}
            </span>{" "}
            hingga{" "}
            <span className="font-semibold text-slate-900">
              {Math.min(page * limit, total)}
            </span>{" "}
            dari <span className="font-semibold text-slate-900">{total}</span> total data
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

      {/* Modal Add / Edit Product */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 text-lg">
                {formMode === "add" ? "Tambah Produk Baru" : "Edit Produk"}
              </h3>
              <button
                onClick={() => setIsFormModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nama Produk <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  maxLength={150}
                  value={formData.product_name}
                  onChange={(e) =>
                    setFormData({ ...formData, product_name: e.target.value })
                  }
                  placeholder="Contoh: Hydraulic Hose SAE 100 R2AT"
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 ${
                    formErrors.product_name
                      ? "border-red-500 focus:ring-red-200"
                      : "border-slate-300 focus:ring-blue-200"
                  }`}
                />
                {formErrors.product_name && (
                  <p className="text-red-500 text-xs mt-1">
                    {formErrors.product_name}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Deskripsi Produk
                </label>
                <textarea
                  rows={3}
                  maxLength={500}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Deskripsi atau spesifikasi produk..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Harga (Rp) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({ ...formData, price: e.target.value })
                    }
                    placeholder="0"
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 ${
                      formErrors.price
                        ? "border-red-500 focus:ring-red-200"
                        : "border-slate-300 focus:ring-blue-200"
                    }`}
                  />
                  {formErrors.price && (
                    <p className="text-red-500 text-xs mt-1">
                      {formErrors.price}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Stok Awal <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.stock}
                    onChange={(e) =>
                      setFormData({ ...formData, stock: e.target.value })
                    }
                    placeholder="0"
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 ${
                      formErrors.stock
                        ? "border-red-500 focus:ring-red-200"
                        : "border-slate-300 focus:ring-blue-200"
                    }`}
                  />
                  {formErrors.stock && (
                    <p className="text-red-500 text-xs mt-1">
                      {formErrors.stock}
                    </p>
                  )}
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-slate-200 mt-6">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-sm font-semibold transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {submitting ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detail Product */}
      {isDetailModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 text-lg">
                Detail Master Produk
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
                <span className="w-36 text-slate-500 font-medium">Product ID:</span>
                <span className="text-slate-900 font-bold">{selectedProduct.product_id}</span>
              </div>
              <div className="flex border-b border-slate-100 pb-2">
                <span className="w-36 text-slate-500 font-medium">Nama Produk:</span>
                <span className="text-slate-900 font-semibold">{selectedProduct.product_name}</span>
              </div>
              <div className="flex border-b border-slate-100 pb-2">
                <span className="w-36 text-slate-500 font-medium">Deskripsi:</span>
                <span className="text-slate-700">{selectedProduct.description || "-"}</span>
              </div>
              <div className="flex border-b border-slate-100 pb-2">
                <span className="w-36 text-slate-500 font-medium">Harga:</span>
                <span className="text-slate-900 font-bold">
                  Rp {Number(selectedProduct.price).toLocaleString("id-ID", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex border-b border-slate-100 pb-2">
                <span className="w-36 text-slate-500 font-medium">Stok:</span>
                <span className="text-slate-900 font-semibold">{selectedProduct.stock} unit</span>
              </div>
              <div className="flex border-b border-slate-100 pb-2">
                <span className="w-36 text-slate-500 font-medium">Status:</span>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                    selectedProduct.is_active
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-rose-50 text-rose-700 border border-rose-200"
                  }`}
                >
                  {selectedProduct.is_active ? "Aktif" : "Nonaktif"}
                </span>
              </div>
              <div className="flex border-b border-slate-100 pb-2">
                <span className="w-36 text-slate-500 font-medium">Waktu Dibuat:</span>
                <span className="text-slate-700">
                  {new Date(selectedProduct.created_at).toLocaleString("id-ID")}
                </span>
              </div>
              <div className="flex pb-2">
                <span className="w-36 text-slate-500 font-medium">Terakhir Diupdate:</span>
                <span className="text-slate-700">
                  {new Date(selectedProduct.updated_at).toLocaleString("id-ID")}
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

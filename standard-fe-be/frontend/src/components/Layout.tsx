import React, { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Package, ShoppingCart, Layers } from "lucide-react";

interface LayoutProps {
  children: ReactNode;
  title?: string;
}

export default function Layout({ children, title }: LayoutProps) {
  const router = useRouter();

  const navItems = [
    {
      label: "Master Produk",
      href: "/products",
      icon: Package,
    },
    {
      label: "Transaksi Produk",
      href: "/transactions",
      icon: ShoppingCart,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 text-white p-2 rounded-lg shadow-sm">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <span className="text-lg font-bold text-slate-800 tracking-tight">
                  SATRIA Standard
                </span>
                <span className="ml-2 text-xs font-semibold px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full border border-blue-200">
                  FE + BE Architecture
                </span>
              </div>
            </div>

            <nav className="flex space-x-1 sm:space-x-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = router.pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {title && (
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {title}
            </h1>
          </div>
        )}
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-slate-500">
          SATRIA Standard Reference Implementation &bull; Master Produk & Transaksi Produk
        </div>
      </footer>
    </div>
  );
}

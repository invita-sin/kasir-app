"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ArrowDownToLine,
  ArrowUpFromLine,
  ShoppingCart,
  History,
  Menu,
  Store,
  LogOut,
  User,
  Users,
} from "lucide-react";
import { Toaster } from "react-hot-toast";
import toast from "react-hot-toast";
import { apiGet, apiPost } from "@/lib/api-client";
import "./globals.css";

const adminNavItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/products", label: "Produk", icon: Package },
  { href: "/stock-in", label: "Stok Masuk", icon: ArrowDownToLine },
  { href: "/stock-out", label: "Stok Keluar", icon: ArrowUpFromLine },
  { href: "/transactions", label: "Kasir", icon: ShoppingCart },
  { href: "/transactions/history", label: "Riwayat", icon: History },
  { href: "/users", label: "Pengguna", icon: Users },
];

const kasirNavItems = [
  { href: "/transactions", label: "Kasir", icon: ShoppingCart },
  { href: "/transactions/history", label: "Riwayat", icon: History },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [role, setRole] = useState("");
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    apiGet<{ id: string; username: string; name: string; role: string }>("/api/auth/me")
      .then((d) => { setUsername(d.name || d.username); setRole(d.role); })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    try {
      await apiPost("/api/auth/logout", {});
      toast.success("Logout berhasil");
      router.push("/login");
    } catch { 
      router.push("/login");
    }
  };

  if (pathname === "/login") {
    return (
      <html lang="id">
        <body className="bg-gray-50 min-h-screen">
          <Toaster position="top-right" />
          {children}
        </body>
      </html>
    );
  }

  const allNavItems = role === "ADMIN" ? adminNavItems : kasirNavItems;

  return (
    <html lang="id">
      <body className="bg-gray-50 min-h-screen">
        <Toaster position="top-right" />
        <div className="flex h-screen overflow-hidden">
          <aside
            className={`${
              sidebarOpen ? "translate-x-0" : "-translate-x-full"
            } fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 transition-transform lg:translate-x-0 lg:static lg:inset-auto`}
          >
            <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-200">
              <Store className="w-6 h-6 text-blue-600" />
              <span className="font-bold text-lg">Kasir Malaka</span>
            </div>
            <nav className="p-4 space-y-1">
              {allNavItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-blue-50 text-blue-700"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </aside>
          {sidebarOpen && (
            <div
              className="fixed inset-0 z-20 bg-black/30 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}
          <div className="flex-1 flex flex-col min-w-0">
            <header className="h-14 bg-white border-b border-gray-200 flex items-center px-4 gap-3 lg:px-6 no-print">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="ml-auto flex items-center gap-2 text-sm text-gray-500">
                <User className="w-4 h-4" />
                <span>{username || "User"}</span>
                {role && (
                  <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                    role === "ADMIN" ? "bg-purple-100 text-purple-700" : "bg-green-100 text-green-700"
                  }`}>
                    {role}
                  </span>
                )}
              </div>
            </header>
            <main className="flex-1 overflow-auto p-4 lg:p-6">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}

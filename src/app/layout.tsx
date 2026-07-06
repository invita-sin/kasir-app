"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ArrowDownToLine,
  ArrowUpFromLine,
  ShoppingCart,
  History,
  Store,
  LogOut,
  User,
  Users,
  SunIcon,
  MoonIcon,
} from "lucide-react";
import { Toaster } from "react-hot-toast";
import toast from "react-hot-toast";
import { apiPost } from "@/lib/api-client";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { ThemeProvider, useTheme } from "@/lib/theme-context";
import "./globals.css";

const superAdminNavItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/products", label: "Produk", icon: Package },
  { href: "/stock-in", label: "Stok Masuk", icon: ArrowDownToLine },
  { href: "/stock-out", label: "Stok Keluar", icon: ArrowUpFromLine },
  { href: "/transactions", label: "Kasir", icon: ShoppingCart },
  { href: "/transactions/history", label: "Riwayat", icon: History },
  { href: "/cabang", label: "Cabang", icon: Store },
  { href: "/users", label: "Pengguna", icon: Users },
];

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

function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();

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
        <body className="bg-gray-50 min-h-screen dark:bg-gray-950">
          <Toaster position="top-right" />
          {children}
        </body>
      </html>
    );
  }

  const role = user?.role || "";
  const cabang = user?.cabang || null;
  const allNavItems = role === "SUPER_ADMIN" ? superAdminNavItems : role === "ADMIN" ? adminNavItems : kasirNavItems;

  return (
    <html lang="id">
      <body className="bg-gray-50 min-h-screen dark:bg-gray-950">
        <Toaster position="top-right" />
        <div className="flex flex-col min-h-screen">
          <header className="h-14 bg-white border-b border-gray-200 dark:bg-gray-800 dark:border-gray-700 flex items-center px-4 gap-3 no-print shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <Store className="w-5 h-5 text-blue-600 shrink-0" />
              <span className="font-bold text-base text-gray-800 truncate dark:text-gray-100">{cabang?.appName || "Kasir App"}</span>
            </div>
            <div className="ml-auto flex items-center gap-2 text-sm text-gray-500 shrink-0">
              <User className="w-4 h-4" />
              <span className="hidden sm:inline dark:text-gray-300">{user?.name || "User"}</span>
              {role && (
                <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                  role === "SUPER_ADMIN" ? "bg-red-100 text-red-700" : role === "ADMIN" ? "bg-purple-100 text-purple-700" : "bg-green-100 text-green-700"
                }`}>
                  {role === "SUPER_ADMIN" ? "SA" : role === "ADMIN" ? "ADM" : role}
                </span>
              )}
              <button onClick={toggleTheme} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                {theme === "dark" ? <SunIcon className="w-4 h-4" /> : <MoonIcon className="w-4 h-4" />}
              </button>
              <button onClick={handleLogout} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-600 dark:hover:text-red-400 ml-1">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </header>
          <main className="flex-1 overflow-auto p-4 lg:p-6 pb-20">{children}</main>
          <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 dark:bg-gray-800 dark:border-gray-700 h-16 safe-area-bottom no-print">
            <div className="flex items-center justify-around h-full max-w-lg mx-auto px-2">
              {allNavItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex flex-col items-center justify-center gap-0.5 px-1 py-1 rounded-lg min-w-0 ${
                      isActive ? "text-blue-600" : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    }`}
                  >
                    <item.icon className="w-5 h-5 shrink-0" />
                    <span className="text-[10px] leading-tight text-center truncate w-full">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>
        </div>
      </body>
    </html>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ThemeProvider>
        <AppShell>{children}</AppShell>
      </ThemeProvider>
    </AuthProvider>
  );
}

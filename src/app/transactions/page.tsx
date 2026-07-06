"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Search, Trash2, Minus, Plus, ShoppingCart, Printer } from "lucide-react";
import { formatRupiah } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { apiGet, apiPost } from "@/lib/api-client";
import toast from "react-hot-toast";

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
}

interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

export default function Cashier() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [lastSale, setLastSale] = useState<{ id: string; total: number; items: CartItem[] } | null>(null);
  const { user } = useAuth();
  const cabang = user?.cabang ?? null;

  const loadProducts = useCallback(async (q: string) => {
    const params = new URLSearchParams({ all: "true" });
    if (q) params.set("search", q);
    try {
      const data = await apiGet<Product[] | { data: Product[] }>(`/api/products?${params}`);
      setProducts(Array.isArray(data) ? data : (data as { data: Product[] }).data);
    } catch {
      // silently fail
    }
    setLoading(false);
  }, []);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => loadProducts(search), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search, loadProducts]);

  const refreshProducts = useCallback(() => loadProducts(search), [search, loadProducts]);

  const addToCart = (product: Product) => {
    if (product.stock <= 0) {
      toast.error("Stok produk habis");
      return;
    }
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          toast.error("Stok tidak mencukupi");
          return prev;
        }
        return prev.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [
        ...prev,
        { productId: product.id, name: product.name, price: product.price, quantity: 1 },
      ];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) => {
      const item = prev.find((i) => i.productId === productId);
      const product = products.find((p) => p.id === productId);
      if (!item || !product) return prev;

      const newQty = item.quantity + delta;
      if (newQty <= 0) return prev.filter((i) => i.productId !== productId);
      if (newQty > product.stock) {
        toast.error("Stok tidak mencukupi");
        return prev;
      }
      return prev.map((i) =>
        i.productId === productId ? { ...i, quantity: newQty } : i
      );
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.productId !== productId));
  };

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  interface SaleItemResponse {
    product: { name: string };
    quantity: number;
    price: number;
  }

  interface SaleResponse {
    id: string;
    total: number;
    items: SaleItemResponse[];
  }

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error("Keranjang kosong");
      return;
    }
    setCheckoutLoading(true);

    try {
      const sale = await apiPost<SaleResponse>("/api/transactions", {
        items: cart.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      });
      setLastSale({
        id: sale.id,
        total: sale.total,
        items: sale.items.map((i) => ({
          name: i.product.name,
          quantity: i.quantity,
          price: i.price,
          productId: "",
        })),
      });
      setCart([]);
      toast.success("Transaksi berhasil!");
      refreshProducts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Transaksi gagal");
    }
    setCheckoutLoading(false);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleNewTransaction = () => {
    setLastSale(null);
  };

  if (lastSale) {
    const itemCount = lastSale.items.reduce((sum, i) => sum + i.quantity, 0);
    return (
      <>
        <style>{`
          @media print {
            .receipt-wrapper { page-break-inside: avoid; page-break-after: avoid; }
            .receipt-card { box-shadow: none !important; border: none !important; padding: 0 !important; margin: 0 !important; }
            .receipt-card h2 { font-size: 14px !important; }
            .receipt-card p, .receipt-card span, .receipt-card div { font-size: 10px !important; }
            .receipt-card .total-text { font-size: 14px !important; }
          }
        `}</style>
        <div className="receipt-wrapper max-w-sm mx-auto mt-8">
          <div className="receipt-card bg-white rounded-xl shadow-sm border border-gray-100 p-6 dark:bg-gray-800 dark:border-gray-700">
            <div className="text-center mb-4">
              <h2 className="font-bold text-lg">{cabang?.appName || "Kasir App"}</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">{cabang?.address || cabang?.name || "Outlet"}</p>
              {cabang?.phone && <p className="text-xs text-gray-500 dark:text-gray-400">Telp: {cabang.phone}</p>}
            </div>

            <div className="border-t border-dashed border-gray-300 pt-2 mb-3 text-xs text-gray-600 dark:border-gray-600 dark:text-gray-300">
              <div className="flex justify-between">
                <span>No. {lastSale.id.slice(-8).toUpperCase()}</span>
                <span>{new Date().toLocaleString("id-ID")}</span>
              </div>
              <div className="flex justify-between mt-0.5">
                <span>{cabang?.name || "Outlet"}</span>
                <span>{itemCount} item</span>
              </div>
            </div>

            <div className="border-t border-dashed border-gray-300 pt-2 text-xs font-semibold text-gray-700 dark:border-gray-600 dark:text-gray-300">
              <div className="flex justify-between mb-1">
                <span className="flex-1">Item</span>
                <span className="w-12 text-right">Qty</span>
                <span className="w-20 text-right">Harga</span>
                <span className="w-20 text-right">Total</span>
              </div>
            </div>

            <div className="mb-3 space-y-1.5 text-sm">
              {lastSale.items.map((item, i) => (
                <div key={i} className="flex justify-between">
                  <span className="flex-1 truncate">{item.name}</span>
                  <span className="w-12 text-right text-gray-500 dark:text-gray-400">{item.quantity}</span>
                  <span className="w-20 text-right text-gray-500 dark:text-gray-400">{formatRupiah(item.price)}</span>
                  <span className="w-20 text-right font-medium">{formatRupiah(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-dashed border-gray-300 pt-2 space-y-1 text-sm dark:border-gray-600">
              <div className="flex justify-between text-gray-600 dark:text-gray-300">
                <span>Subtotal</span>
                <span>{formatRupiah(lastSale.total)}</span>
              </div>
              <div className="flex justify-between text-gray-600 dark:text-gray-300">
                <span>Diskon</span>
                <span>Rp 0</span>
              </div>
              <div className="flex justify-between font-bold text-base border-t border-double border-gray-400 pt-1 mt-1 dark:border-gray-600">
                <span className="total-text">TOTAL</span>
                <span className="total-text">{formatRupiah(lastSale.total)}</span>
              </div>
            </div>

            <div className="text-center mt-4 text-xs text-gray-400 dark:text-gray-500">
              <p>Terima kasih atas kunjungan Anda</p>
              <p>Barang yang sudah dibeli dapat diretur sesuai ketentuan</p>
              <p className="mt-1 font-mono">--- LUNAS ---</p>
            </div>

            <div className="flex gap-3 mt-6 no-print">
              <button
                onClick={handlePrint}
                className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 text-sm font-medium"
              >
                <Printer className="w-4 h-4" />
                Cetak Struk
              </button>
              <button
                onClick={handleNewTransaction}
                className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
              >
                Transaksi Baru
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-5 h-full">
      <div className="flex-1 space-y-4">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Kasir</h1>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder="Cari produk..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:focus:ring-blue-400"
          />
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">Memuat...</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {products.map((product) => (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                disabled={product.stock <= 0}
                className={`text-left p-4 rounded-xl border transition-all ${
                  product.stock <= 0
                    ? "bg-gray-50 border-gray-200 opacity-50 cursor-not-allowed dark:bg-gray-700/50 dark:border-gray-600"
                    : "bg-white border-gray-200 hover:border-blue-300 hover:shadow-sm dark:bg-gray-800 dark:border-gray-700"
                }`}
              >
                <p className="text-sm font-semibold text-gray-800 truncate dark:text-gray-100">{product.name}</p>
                <p className="text-sm font-bold text-blue-600 mt-1">
                  {formatRupiah(product.price)}
                </p>
                <p className={`text-xs mt-1 ${
                  product.stock <= 5 ? "text-red-500" : "text-gray-400 dark:text-gray-500"
                }`}>
                  Stok: {product.stock}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="lg:w-80 bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col h-fit lg:sticky lg:top-6 dark:bg-gray-800 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-4">
          <ShoppingCart className="w-5 h-5 text-blue-600" />
          <h2 className="font-semibold">Keranjang</h2>
          <span className="text-sm text-gray-400 ml-auto dark:text-gray-500">{cart.length} item</span>
        </div>

        {cart.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8 dark:text-gray-500">Belum ada item</p>
        ) : (
          <div className="space-y-3 mb-4 max-h-96 overflow-auto">
            {cart.map((item) => (
              <div key={item.productId} className="flex items-center gap-2 border-b border-gray-50 pb-3 dark:border-gray-700">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.name}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {formatRupiah(item.price)} x {item.quantity}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => updateQuantity(item.productId, -1)}
                    className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.productId, 1)}
                    className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-sm font-medium w-20 text-right">
                  {formatRupiah(item.price * item.quantity)}
                </p>
                <button
                  onClick={() => removeFromCart(item.productId)}
                  className="p-1 rounded hover:bg-red-50 text-red-400 dark:hover:bg-red-900/30"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="border-t border-gray-200 pt-3 mb-4 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <span className="font-semibold">Total</span>
            <span className="font-bold text-lg text-blue-600">{formatRupiah(total)}</span>
          </div>
        </div>

        <button
          onClick={handleCheckout}
          disabled={cart.length === 0 || checkoutLoading}
          className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {checkoutLoading ? "Memproses..." : `Bayar ${formatRupiah(total)}`}
        </button>
      </div>
    </div>
  );
}

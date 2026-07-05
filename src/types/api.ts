// Shared types between frontend and backend

export interface ProductData {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  minStock: number;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StockInData {
  id: string;
  productId: string;
  quantity: number;
  note: string | null;
  createdAt: string;
  product: { id: string; name: string; sku: string };
}

export interface StockOutData {
  id: string;
  productId: string;
  quantity: number;
  note: string | null;
  createdAt: string;
  product: { id: string; name: string; sku: string; stock: number };
}

export interface SaleItemData {
  id: string;
  saleId: string;
  productId: string;
  quantity: number;
  price: number;
  product: { id: string; name: string; sku: string; price: number };
}

export interface SaleData {
  id: string;
  total: number;
  createdAt: string;
  items: SaleItemData[];
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface DashboardData {
  totalProducts: number;
  totalSales: number;
  totalRevenue: number;
  lowStockProducts: { id: string; name: string; stock: number; minStock: number }[];
  recentSales: SaleData[];
  recentStockIn: StockInData[];
  recentStockOut: StockOutData[];
}

export interface UserData {
  id: string;
  username: string;
  name: string;
  role: string;
  createdAt: string;
}

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

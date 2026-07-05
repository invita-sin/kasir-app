import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from "prom-client";

const register = new Registry();

collectDefaultMetrics({ register });

export const httpRequestsTotal = new Counter({
  name: "http_requests_total",
  help: "Total HTTP requests",
  labelNames: ["method", "path", "status"] as const,
  registers: [register],
});

export const httpRequestDurationSeconds = new Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "path"] as const,
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
  registers: [register],
});

export const salesCreatedTotal = new Counter({
  name: "sales_created_total",
  help: "Total sales transactions",
  labelNames: [] as const,
  registers: [register],
});

export const salesRevenueTotal = new Counter({
  name: "sales_revenue_total",
  help: "Total revenue from sales",
  labelNames: [] as const,
  registers: [register],
});

export const stockInTotal = new Counter({
  name: "stock_in_total",
  help: "Total stock-in entries",
  labelNames: [] as const,
  registers: [register],
});

export const stockOutTotal = new Counter({
  name: "stock_out_total",
  help: "Total stock-out entries",
  labelNames: [] as const,
  registers: [register],
});

export const lowStockProducts = new Gauge({
  name: "low_stock_products",
  help: "Number of products below minimum stock",
  labelNames: [] as const,
  registers: [register],
});

export const totalProducts = new Gauge({
  name: "total_products",
  help: "Total products in inventory",
  labelNames: [] as const,
  registers: [register],
});

export async function getMetricsContentType(): Promise<string> {
  return register.contentType;
}

export async function getMetrics(): Promise<string> {
  return register.metrics();
}

import http from "k6/http";
import { check, sleep, group } from "k6";
import { Rate, Trend } from "k6/metrics";

const errorRate = new Rate("errors");
const loginDuration = new Trend("login_duration");
const productListDuration = new Trend("product_list_duration");
const createSaleDuration = new Trend("create_sale_duration");
const stockInDuration = new Trend("stock_in_duration");

export const options = {
  stages: [
    { duration: "1m", target: 10 },
    { duration: "3m", target: 10 },
    { duration: "1m", target: 25 },
    { duration: "3m", target: 25 },
    { duration: "1m", target: 0 },
  ],
  thresholds: {
    http_req_duration: ["p(95)<2000"],
    http_req_failed: ["rate<0.05"],
    errors: ["rate<0.1"],
  },
};

const BASE_URL = __ENV.BASE_URL || "http://127.0.0.1:3000";

let cookie = "";

function k6fetch(method, path, body) {
  const url = `${BASE_URL}${path}`;
  const params = { headers: { "Content-Type": "application/json" } };
  if (cookie) params.headers["Cookie"] = cookie;

  const res = body
    ? http.post(url, JSON.stringify(body), params)
    : http[method.toLowerCase()](url, params);

  const setCookie = res.headers["Set-Cookie"] || res.headers["set-cookie"];
  if (setCookie) cookie = setCookie;

  return res;
}

export function setup() {
  const res = k6fetch("POST", "/api/auth/login", {
    username: "admin",
    password: "admin123",
  });
  return { cookie };
}

export default function () {
  group("products", () => {
    const tStart = Date.now();
    const res = k6fetch("GET", "/api/products?page=1&limit=20");
    productListDuration.add(Date.now() - tStart);

    const passed = check(res, {
      "products status 200": (r) => r.status === 200,
      "products has data": (r) => {
        try {
          return JSON.parse(r.body).data.length > 0;
        } catch {
          return false;
        }
      },
    });
    if (!passed) errorRate.add(1);
  });

  group("stock-in", () => {
    const productsRes = k6fetch("GET", "/api/products?all=true");
    if (productsRes.status !== 200) {
      errorRate.add(1);
      return;
    }

    let products;
    try {
      products = JSON.parse(productsRes.body);
    } catch {
      errorRate.add(1);
      return;
    }

    if (products.length === 0) return;

    const tStart = Date.now();
    const res = k6fetch("POST", "/api/stock-in", {
      productId: products[0].id,
      quantity: 1,
      note: "Load test stock-in",
    });
    stockInDuration.add(Date.now() - tStart);

    const passed = check(res, {
      "stock-in status 201": (r) => r.status === 201,
    });
    if (!passed) errorRate.add(1);
  });

  group("checkout", () => {
    const productsRes = k6fetch("GET", "/api/products?all=true&search=Kopi");
    if (productsRes.status !== 200) {
      errorRate.add(1);
      return;
    }

    let products;
    try {
      products = JSON.parse(productsRes.body);
    } catch {
      errorRate.add(1);
      return;
    }

    if (products.length === 0) return;
    const product = products[0];

    const tStart = Date.now();
    const res = k6fetch("POST", "/api/transactions", {
      items: [{ productId: product.id, quantity: 1 }],
    });
    createSaleDuration.add(Date.now() - tStart);

    const passed = check(res, {
      "sale status 201": (r) => r.status === 201,
      "sale has total": (r) => {
        try {
          return JSON.parse(r.body).total > 0;
        } catch {
          return false;
        }
      },
    });
    if (!passed) errorRate.add(1);
  });

  group("dashboard", () => {
    const res = k6fetch("GET", "/api/dashboard");

    const passed = check(res, {
      "dashboard status 200": (r) => r.status === 200,
    });
    if (!passed) errorRate.add(1);
  });

  sleep(2);
}

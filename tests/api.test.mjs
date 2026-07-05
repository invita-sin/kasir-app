import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { spawn } from "node:child_process";
import { request } from "node:http";

const BASE_URL = "http://127.0.0.1:9000";
let server;
let cookie = "";

function fetch(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const opts = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: { "Content-Type": "application/json" },
    };
    if (cookie) opts.headers["Cookie"] = cookie;

    const req = request(opts, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        const setCookie = res.headers["set-cookie"];
        if (setCookie) cookie = setCookie.join("; ");
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

before(async () => {
  console.log("Starting server...");
  server = spawn("node", ["-e", `
    const http=require('http'),{parse}=require('url'),next=require('next');
    const app=next({dev:false,dir:'./',hostname:'127.0.0.1',port:9000});
    const handle=app.getRequestHandler();
    app.prepare().then(()=>{
      http.createServer((q,r)=>{handle(q,r,parse(q.url,true));}).listen(9000,'127.0.0.1',()=>console.log('READY'));
    });
  `], { cwd: process.cwd(), stdio: ["ignore", "pipe", "pipe"] });

  await new Promise((resolve) => {
    server.stdout.on("data", (d) => {
      if (d.toString().includes("READY")) resolve();
    });
    setTimeout(() => resolve(), 30000);
  });
  console.log("Server ready");
});

after(() => {
  if (server) server.kill();
});

describe("Auth", () => {
  it("redirects to login when unauthenticated", async () => {
    const res = await fetch("GET", "/");
    assert.equal(res.status, 307);
  });

  it("login with wrong credentials", async () => {
    const res = await fetch("POST", "/api/auth/login", {
      username: "admin",
      password: "wrong",
    });
    assert.equal(res.status, 401);
  });

  it("login with correct credentials", async () => {
    const res = await fetch("POST", "/api/auth/login", {
      username: "admin",
      password: "admin123",
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
  });

  it("access dashboard after login", async () => {
    const res = await fetch("GET", "/");
    assert.equal(res.status, 200);
  });
});

describe("Products", () => {
  it("GET /api/products returns paginated list", async () => {
    const res = await fetch("GET", "/api/products");
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.total > 0);
    assert.ok(res.body.totalPages >= 1);
  });

  it("GET /api/products?search=Kopi", async () => {
    const res = await fetch("GET", "/api/products?search=Kopi");
    assert.equal(res.status, 200);
    assert.ok(res.body.data.length > 0);
  });

  it("POST /api/products creates product", async () => {
    const res = await fetch("POST", "/api/products", {
      name: "Test Produk",
      sku: "TEST-001",
      price: 10000,
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.name, "Test Produk");
  });

  it("POST /api/products duplicate SKU", async () => {
    const res = await fetch("POST", "/api/products", {
      name: "Duplikat",
      sku: "TEST-001",
      price: 5000,
    });
    assert.equal(res.status, 409);
  });

  it("GET /api/products/:id", async () => {
    const list = await fetch("GET", "/api/products?search=TEST-001");
    const id = list.body.data[0]?.id;
    if (!id) return;
    const res = await fetch("GET", `/api/products/${id}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.name, "Test Produk");
  });

  it("DELETE /api/products/:id", async () => {
    const list = await fetch("GET", "/api/products?search=TEST-001");
    const id = list.body.data[0]?.id;
    if (!id) return;
    const res = await fetch("DELETE", `/api/products/${id}`);
    assert.equal(res.status, 200);
  });
});

describe("Stock In", () => {
  it("GET /api/stock-in returns paginated list", async () => {
    const res = await fetch("GET", "/api/stock-in");
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
  });

  it("POST /api/stock-in creates stock entry", async () => {
    const products = await fetch("GET", "/api/products?limit=1");
    const productId = products.body.data[0]?.id;
    if (!productId) return;

    const res = await fetch("POST", "/api/stock-in", {
      productId,
      quantity: 5,
      note: "Test stok masuk",
    });
    assert.equal(res.status, 201);
  });
});

describe("Transactions", () => {
  it("GET /api/transactions returns paginated list", async () => {
    const res = await fetch("GET", "/api/transactions");
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
  });

  it("POST /api/transactions with empty items", async () => {
    const res = await fetch("POST", "/api/transactions", { items: [] });
    assert.equal(res.status, 400);
  });

  it("POST /api/transactions creates sale", async () => {
    const products = await fetch("GET", "/api/products?limit=1");
    const product = products.body.data[0];
    if (!product) return;

    const res = await fetch("POST", "/api/transactions", {
      items: [{ productId: product.id, quantity: 1 }],
    });
    assert.equal(res.status, 201);
    assert.ok(res.body.total > 0);
  });
});

describe("Dashboard", () => {
  it("GET /api/dashboard returns summary", async () => {
    const res = await fetch("GET", "/api/dashboard");
    assert.equal(res.status, 200);
    assert.ok(res.body.totalProducts > 0);
    assert.ok(typeof res.body.totalRevenue === "number");
  });
});

import { NextRequest, NextResponse } from "next/server";
import { ProductService } from "@/lib/services/product.service";
import { getUser } from "@/lib/get-user";
import { logger } from "@/lib/logger";
import { parseJsonBody } from "@/lib/request";
import { withApiHandler } from "@/lib/api-handler";

export const GET = withApiHandler(async (req) => {
  const user = await getUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }
  const cabangId = user.cabangId;

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || undefined;
  const all = searchParams.get("all") === "true";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const limit = Math.max(1, parseInt(searchParams.get("limit") || "50", 10) || 50);

  const queryCabangId = searchParams.get("cabangId") || undefined;
  const effectiveCabangId = user.role === "SUPER_ADMIN" ? queryCabangId : (cabangId || undefined);

  const result = await ProductService.list({ search, page, limit, all, cabangId: effectiveCabangId });

  return NextResponse.json(result);
}, "GET", "/api/products");

export const POST = withApiHandler(async (req) => {
  const user = await getUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }
  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 });
  }

  const body = await parseJsonBody(req);
  const product = await ProductService.create(body, user.cabangId || "", user.role);

  logger.info({ event: "product.created", sku: product.sku, id: product.id });

  return NextResponse.json(product, { status: 201 });
}, "POST", "/api/products");

import { NextRequest, NextResponse } from "next/server";
import { ProductService } from "@/lib/services/product.service";
import { getUser } from "@/lib/get-user";
import { logger } from "@/lib/logger";
import { parseJsonBody } from "@/lib/request";
import { withApiHandler } from "@/lib/api-handler";

export const GET = withApiHandler(async (req, ctx) => {
  const user = await getUser(req);
  if (!user || !user.cabangId) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const product = await ProductService.getById(id, user.cabangId);

  return NextResponse.json(product);
}, "GET", "/api/products/[id]");

export const PUT = withApiHandler(async (req, ctx) => {
  const user = await getUser(req);
  if (!user || !user.cabangId) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }
  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const body = await parseJsonBody(req);
  const product = await ProductService.update(id, body, user.cabangId);

  logger.info({ event: "product.updated", id: product.id, sku: product.sku });

  return NextResponse.json(product);
}, "PUT", "/api/products/[id]");

export const DELETE = withApiHandler(async (req, ctx) => {
  const user = await getUser(req);
  if (!user || !user.cabangId) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }
  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const result = await ProductService.delete(id, user.cabangId);

  logger.info({ event: "product.deleted", id });

  return NextResponse.json(result);
}, "DELETE", "/api/products/[id]");

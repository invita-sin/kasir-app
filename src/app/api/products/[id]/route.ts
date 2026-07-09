import { NextRequest, NextResponse } from "next/server";
import { ProductService } from "@/lib/services/product.service";
import { logger } from "@/lib/logger";
import { parseJsonBody } from "@/lib/request";
import { withApiHandler } from "@/lib/api-handler";
import { requireAuthOrThrow } from "@/lib/middleware-helpers";
import { ForbiddenError } from "@/lib/errors";

export const GET = withApiHandler(async (req, ctx) => {
  const user = await requireAuthOrThrow(req);
  if (!user.cabangId) throw new ForbiddenError("User tidak memiliki cabang");
  const { id } = await ctx.params;
  const product = await ProductService.getById(id, user.cabangId);

  return NextResponse.json(product);
}, "GET", "/api/products/[id]");

export const PUT = withApiHandler(async (req, ctx) => {
  const user = await requireAuthOrThrow(req);
  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
    throw new ForbiddenError("Akses hanya untuk Admin");
  }
  if (!user.cabangId) throw new ForbiddenError("User tidak memiliki cabang");

  const { id } = await ctx.params;
  const body = await parseJsonBody(req);
  const product = await ProductService.update(id, body, user.cabangId, user.userId);

  logger.info({ event: "product.updated", id: product.id, sku: product.sku });

  return NextResponse.json(product);
}, "PUT", "/api/products/[id]");

export const DELETE = withApiHandler(async (req, ctx) => {
  const user = await requireAuthOrThrow(req);
  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
    throw new ForbiddenError("Akses hanya untuk Admin");
  }
  if (!user.cabangId) throw new ForbiddenError("User tidak memiliki cabang");

  const { id } = await ctx.params;
  const result = await ProductService.delete(id, user.cabangId, user.userId);

  logger.info({ event: "product.deleted", id });

  return NextResponse.json(result);
}, "DELETE", "/api/products/[id]");

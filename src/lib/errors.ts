import { NextResponse } from "next/server";
import { logger, generateRequestId } from "./logger";
import { JsonParseError } from "./request";
import { ZodError } from "zod";

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
    public code: string = "BAD_REQUEST"
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class NotFoundError extends ApiError {
  constructor(resource: string) {
    super(`${resource} tidak ditemukan`, 404, "NOT_FOUND");
    this.name = "NotFoundError";
  }
}

export class ValidationError extends ApiError {
  constructor(message: string) {
    super(message, 400, "VALIDATION_ERROR");
    this.name = "ValidationError";
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message: string = "Unauthorized") {
    super(message, 401, "UNAUTHORIZED");
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends ApiError {
  constructor(message: string = "Forbidden") {
    super(message, 403, "FORBIDDEN");
    this.name = "ForbiddenError";
  }
}

export class ConflictError extends ApiError {
  constructor(message: string) {
    super(message, 409, "CONFLICT");
    this.name = "ConflictError";
  }
}

export interface ErrorResponse {
  error: string;
  code: string;
  requestId?: string;
}

export function handleApiError(error: unknown, requestId?: string): NextResponse {
  const rid = requestId || generateRequestId();

  if (error instanceof JsonParseError) {
    logger.warn({ event: "request.invalid_json", requestId: rid });
    return NextResponse.json(
      { error: "Format data tidak valid", code: "INVALID_JSON", requestId: rid } satisfies ErrorResponse,
      { status: 400 }
    );
  }

  if (error instanceof ZodError) {
    const messages = error.issues.map((i) => i.message).join(", ");
    logger.warn({ event: "validation.error", requestId: rid, errors: messages });
    return NextResponse.json(
      { error: messages, code: "VALIDATION_ERROR", requestId: rid } satisfies ErrorResponse,
      { status: 400 }
    );
  }

  if (error instanceof ApiError) {
    logger.warn(error.message, {
      requestId: rid,
      statusCode: error.statusCode,
      code: error.code,
    });
    return NextResponse.json(
      { error: error.message, code: error.code, requestId: rid } satisfies ErrorResponse,
      { status: error.statusCode }
    );
  }

  const message = error instanceof Error ? error.message : "Terjadi kesalahan internal";
  logger.error(message, {
    requestId: rid,
    error: error instanceof Error ? error.stack : undefined,
  });
  return NextResponse.json(
    { error: "Terjadi kesalahan internal", code: "INTERNAL_ERROR", requestId: rid } satisfies ErrorResponse,
    { status: 500 }
  );
}

import { NextRequest, NextResponse } from "next/server";

export async function parseJsonBody(req: NextRequest): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new JsonParseError();
  }
}

export class JsonParseError extends Error {
  constructor() {
    super("Invalid JSON body");
    this.name = "JsonParseError";
  }
}

export function handleJsonParseError(requestId: string): NextResponse {
  return NextResponse.json(
    { error: "Format data tidak valid", code: "INVALID_JSON", requestId },
    { status: 400 }
  );
}

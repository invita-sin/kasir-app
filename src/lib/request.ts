import { NextRequest } from "next/server";

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



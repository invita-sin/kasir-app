import type { JwtPayload } from "@/lib/services/auth.service";
import { config } from "@/lib/config";

const JWT_SECRET = new TextEncoder().encode(config.JWT_SECRET);

async function createHmacSignature(data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw", JWT_SECRET, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return btoa(Array.from(new Uint8Array(sig), (b) => String.fromCharCode(b)).join(""))
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function base64UrlDecode(str: string): string {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  return atob(str);
}

export async function verifyTokenEdge(token: string): Promise<JwtPayload | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const expectedSig = await createHmacSignature(`${parts[0]}.${parts[1]}`);
    if (expectedSig !== parts[2]) return null;

    const payload: JwtPayload = JSON.parse(base64UrlDecode(parts[1]));
    if (Date.now() > payload.exp) return null;

    return payload;
  } catch {
    return null;
  }
}

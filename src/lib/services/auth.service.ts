import { prisma } from "@/lib/prisma";
import { config } from "@/lib/config";
import { UnauthorizedError, NotFoundError, ConflictError, ValidationError } from "@/lib/errors";
import { z } from "zod";

export interface JwtPayload {
  userId: string;
  username: string;
  role: string;
  name: string;
  cabangId: string | null;
  cabangName: string | null;
  iat: number;
  exp: number;
  type?: string;
}

const JWT_SECRET = new TextEncoder().encode(config.JWT_SECRET);

async function createHmacSignature(data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw", JWT_SECRET, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return btoa(Array.from(new Uint8Array(sig), (b) => String.fromCharCode(b)).join(""))
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function base64UrlEncode(data: string): string {
  return btoa(data).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function base64UrlDecode(str: string): string {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  return atob(str);
}

const PEPPER = new TextEncoder().encode(config.PASSWORD_PEPPER);

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: new Uint8Array([...salt, ...PEPPER]), iterations: 600000, hash: "SHA-256" },
    key, 256
  );
  const saltStr = Array.from(salt, (b) => String.fromCharCode(b)).join("");
  const hashStr = Array.from(new Uint8Array(bits), (b) => String.fromCharCode(b)).join("");
  return btoa(saltStr + hashStr).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

async function verifyPassword(password: string, hashed: string): Promise<boolean> {
  try {
    const decoded = atob(hashed.replace(/-/g, "+").replace(/_/g, "/"));
    const salt = new Uint8Array(decoded.slice(0, 16).split("").map((c) => c.charCodeAt(0)));
    const expectedHash = decoded.slice(16);
    const key = await crypto.subtle.importKey(
      "raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]
    );
    const bits = await crypto.subtle.deriveBits(
      { name: "PBKDF2", salt: new Uint8Array([...salt, ...PEPPER]), iterations: 600000, hash: "SHA-256" },
      key, 256
    );
    const actualHash = String.fromCharCode(...new Uint8Array(bits));
    return actualHash === expectedHash;
  } catch {
    return false;
  }
}

const loginSchema = z.object({
  username: z.string().min(1, "Username wajib diisi"),
  password: z.string().min(1, "Password wajib diisi"),
});

const createUserSchema = z.object({
  username: z.string().min(3, "Username minimal 3 karakter"),
  password: z.string().min(6, "Password minimal 6 karakter"),
  name: z.string().min(1, "Nama wajib diisi"),
  role: z.enum(["SUPER_ADMIN", "ADMIN", "KASIR"]).default("KASIR"),
  cabangId: z.string().nullable().optional(),
});

const updateUserSchema = z.object({
  username: z.string().min(3).optional(),
  password: z.string().min(6).optional(),
  name: z.string().min(1).optional(),
  role: z.enum(["SUPER_ADMIN", "ADMIN", "KASIR"]).optional(),
  cabangId: z.string().nullable().optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const AuthService = {
  async login(body: unknown) {
    const { username, password } = loginSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { username },
      include: { cabang: { select: { id: true, name: true, appName: true, address: true, phone: true } } },
    });
    if (!user) throw new UnauthorizedError("Username atau password salah");

    const valid = await verifyPassword(password, user.password);
    if (!valid) throw new UnauthorizedError("Username atau password salah");

    const cabangId = user.cabangId;
    const cabangName = user.cabang?.name || null;

    const [token, refreshToken] = await Promise.all([
      this.signToken({ userId: user.id, username: user.username, role: user.role, name: user.name, cabangId, cabangName }, "access"),
      this.signToken({ userId: user.id, username: user.username, role: user.role, name: user.name, cabangId, cabangName }, "refresh"),
    ]);

    return {
      id: user.id, token, refreshToken, username: user.username, name: user.name, role: user.role,
      cabang: user.cabang ? { id: user.cabang.id, name: user.cabang.name, appName: user.cabang.appName, address: user.cabang.address, phone: user.cabang.phone } : null,
    };
  },

  async signToken(payload: { userId: string; username: string; role: string; name: string; cabangId: string | null; cabangName: string | null }, type: "access" | "refresh" = "access"): Promise<string> {
    const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
    const now = Date.now();
    const expMs = type === "refresh"
      ? config.JWT_REFRESH_EXPIRY_DAYS * 24 * 60 * 60 * 1000
      : config.JWT_EXPIRY_HOURS * 60 * 60 * 1000;
    const exp = now + expMs;
    const body = base64UrlEncode(JSON.stringify({ ...payload, type, iat: now, exp }));
    const signature = await createHmacSignature(`${header}.${body}`);
    return `${header}.${body}.${signature}`;
  },

  async refreshToken(token: string): Promise<{ token: string; refreshToken: string } | null> {
    try {
      const payload = await this.verifyToken(token);
      if (!payload || payload.type !== "refresh") return null;

      const newAccess = await this.signToken(
        { userId: payload.userId, username: payload.username, role: payload.role, name: payload.name, cabangId: payload.cabangId, cabangName: payload.cabangName },
        "access"
      );
      const newRefresh = await this.signToken(
        { userId: payload.userId, username: payload.username, role: payload.role, name: payload.name, cabangId: payload.cabangId, cabangName: payload.cabangName },
        "refresh"
      );
      return { token: newAccess, refreshToken: newRefresh };
    } catch {
      return null;
    }
  },

  async verifyToken(token: string): Promise<JwtPayload | null> {
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
  },

  async createUser(body: unknown, creatorRole?: string) {
    const input = createUserSchema.parse(body);
    const existing = await prisma.user.findUnique({ where: { username: input.username } });
    if (existing) throw new ConflictError("Username sudah digunakan");

    if (input.role === "SUPER_ADMIN" && creatorRole !== "SUPER_ADMIN") {
      throw new ValidationError("Hanya SUPER_ADMIN yang dapat membuat user SUPER_ADMIN");
    }

    if (input.role !== "SUPER_ADMIN" && !input.cabangId) {
      throw new ValidationError("ADMIN/KASIR harus memiliki cabang");
    }

    const hashed = await hashPassword(input.password);

    const data: Record<string, unknown> = {
      username: input.username,
      password: hashed,
      name: input.name,
      role: input.role,
    };
    if (input.cabangId) data.cabangId = input.cabangId;

    return prisma.user.create({
      data: data as any,
      select: { id: true, username: true, name: true, role: true, cabangId: true, createdAt: true },
    });
  },

  async updateUser(id: string, body: unknown, updaterRole?: string) {
    const input = updateUserSchema.parse(body);
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("User");

    if (input.username && input.username !== existing.username) {
      const dupe = await prisma.user.findUnique({ where: { username: input.username } });
      if (dupe) throw new ConflictError("Username sudah digunakan");
    }

    if (input.role === "SUPER_ADMIN" && updaterRole !== "SUPER_ADMIN") {
      throw new ValidationError("Hanya SUPER_ADMIN yang dapat mengubah role ke SUPER_ADMIN");
    }

    const data: Record<string, unknown> = {};
    if (input.username) data.username = input.username;
    if (input.name) data.name = input.name;
    if (input.role) data.role = input.role;
    if (input.password) data.password = await hashPassword(input.password);
    if (input.cabangId !== undefined) data.cabangId = input.cabangId;

    return prisma.user.update({
      where: { id },
      data,
      select: { id: true, username: true, name: true, role: true, cabangId: true, createdAt: true },
    });
  },

  async deleteUser(id: string) {
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("User");
    if (existing.role === "SUPER_ADMIN") throw new ValidationError("Tidak dapat menghapus SUPER_ADMIN");

    await prisma.user.delete({ where: { id } });
  },

  async listUsers(cabangId?: string) {
    const where = cabangId ? { cabangId } : {};
    return prisma.user.findMany({
      where,
      select: { id: true, username: true, name: true, role: true, cabangId: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
  },

  async getUser(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, username: true, name: true, role: true, cabangId: true, createdAt: true },
    });
    if (!user) throw new NotFoundError("User");
    return user;
  },
};

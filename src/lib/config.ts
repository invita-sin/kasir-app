import { z } from "zod";

const rawSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  ADMIN_USERNAME: z.string().min(1, "ADMIN_USERNAME is required"),
  ADMIN_PASSWORD: z.string().min(6, "ADMIN_PASSWORD must be at least 6 characters"),
  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters"),
  PASSWORD_PEPPER: z.string().min(16, "PASSWORD_PEPPER must be at least 16 characters"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  CORS_ORIGIN: z.string().default("*"),
  JWT_EXPIRY_HOURS: z.coerce.number().positive().default(0.25),
  JWT_REFRESH_EXPIRY_DAYS: z.coerce.number().positive().default(7),
  UPSTASH_REDIS_REST_URL: z.string().default(""),
  UPSTASH_REDIS_REST_TOKEN: z.string().default(""),
});

function validateCors(parsed: z.infer<typeof rawSchema>): z.infer<typeof rawSchema> {
  if (parsed.NODE_ENV === "production" && (!parsed.CORS_ORIGIN || parsed.CORS_ORIGIN === "*")) {
    throw new Error("CORS_ORIGIN must be set to an explicit origin in production");
  }
  return parsed;
}

export type Env = z.infer<typeof rawSchema>;

function parseEnv(): Env {
  const result = rawSchema.safeParse(process.env);
  if (!result.success) {
    const messages = result.error.issues.map(
      (i) => `  - ${i.path.join(".")}: ${i.message}`
    );
    throw new Error(
      `Invalid environment variables:\n${messages.join("\n")}`
    );
  }
  return validateCors(result.data);
}

export const config = parseEnv();

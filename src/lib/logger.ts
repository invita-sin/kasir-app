import { config } from "./config";

type LogLevel = "info" | "warn" | "error" | "debug";

type LogArg = string | { event: string; [key: string]: unknown };

interface LogEntry {
  level: LogLevel;
  timestamp: string;
  message: string;
  [key: string]: unknown;
}

function normalizeArg(arg: LogArg): { message: string; meta?: Record<string, unknown> } {
  if (typeof arg === "string") {
    return { message: arg };
  }
  const { event, ...rest } = arg;
  return { message: event, meta: rest };
}

function formatLog(level: LogLevel, message: string, meta?: Record<string, unknown>): string {
  const timestamp = new Date().toISOString();
  return JSON.stringify({ timestamp, level, message, ...meta });
}

let requestIdCounter = 0;

export function generateRequestId(): string {
  requestIdCounter++;
  return `req_${Date.now()}_${requestIdCounter}`;
}

function makeLogger(level: LogLevel, logFn: typeof console.log) {
  return (arg: LogArg, meta?: Record<string, unknown>) => {
    const { message, meta: extractedMeta } = normalizeArg(arg);
    logFn(formatLog(level, message, { ...extractedMeta, ...meta }));
  };
}

const debugLogger = makeLogger("debug", console.debug);

export const logger = {
  info: makeLogger("info", console.log),
  warn: makeLogger("warn", console.warn),
  error: makeLogger("error", console.error),
  debug: (arg: LogArg, meta?: Record<string, unknown>) => {
    if (config.NODE_ENV !== "production") {
      debugLogger(arg, meta);
    }
  },
};

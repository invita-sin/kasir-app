import { logger } from "./logger";

let shutdown = false;
let initialized = false;

export function isShuttingDown(): boolean {
  return shutdown;
}

export function setupGracefulShutdown() {
  if (initialized) return;
  initialized = true;

  process.on("SIGTERM", async () => {
    if (shutdown) return;
    shutdown = true;
    logger.info({ event: "shutdown.start", signal: "SIGTERM" });

    try {
      const { prisma } = await import("@/lib/prisma");
      await prisma.$disconnect();
      logger.info({ event: "shutdown.prisma_disconnected" });
    } catch (e) {
      logger.error({ event: "shutdown.error", error: String(e) });
    }

    logger.info({ event: "shutdown.complete" });
    process.exit(0);
  });

  process.on("SIGINT", () => {
    process.exit(0);
  });
}

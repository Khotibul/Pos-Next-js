import { PrismaClient, type Prisma } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };
const queryLoggingEnabled = process.env.PRISMA_QUERY_LOG === "1";
type PrismaQueryEventClient = PrismaClient & {
  $on(eventType: "query", callback: (event: Prisma.QueryEvent) => void): void;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: queryLoggingEnabled
      ? [
          { emit: "event", level: "query" },
          { emit: "stdout", level: "error" },
          { emit: "stdout", level: "warn" },
        ]
      : process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
  });

if (queryLoggingEnabled) {
  const slowQueryMs = Number(process.env.PRISMA_SLOW_QUERY_MS ?? 250);
  (prisma as PrismaQueryEventClient).$on("query", (event) => {
    if (event.duration >= slowQueryMs) {
      console.warn(`[prisma:slow] ${event.duration}ms ${event.query}`);
    }
  });
}

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

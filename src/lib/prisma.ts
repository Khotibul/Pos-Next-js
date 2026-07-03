import { PrismaClient, type Prisma } from "@prisma/client";

type PrismaGlobal = {
  prisma: PrismaClient | undefined;
  prismaQueryLogAttached: boolean | undefined;
};

const globalForPrisma = globalThis as unknown as PrismaGlobal;
const queryLoggingEnabled = process.env.PRISMA_QUERY_LOG === "1";

type PrismaQueryEventClient = PrismaClient & {
  $on(eventType: "query", callback: (event: Prisma.QueryEvent) => void): void;
};

function envPositiveInt(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

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
    transactionOptions: {
      maxWait: envPositiveInt("PRISMA_TRANSACTION_MAX_WAIT_MS", 5_000),
      timeout: envPositiveInt("PRISMA_TRANSACTION_TIMEOUT_MS", 15_000),
    },
  });

if (queryLoggingEnabled && !globalForPrisma.prismaQueryLogAttached) {
  const slowQueryMs = envPositiveInt("PRISMA_SLOW_QUERY_MS", 250);
  (prisma as PrismaQueryEventClient).$on("query", (event) => {
    if (event.duration >= slowQueryMs) {
      console.warn(`[prisma:slow] ${event.duration}ms ${event.query}`);
    }
  });
  globalForPrisma.prismaQueryLogAttached = true;
}

globalForPrisma.prisma = prisma;
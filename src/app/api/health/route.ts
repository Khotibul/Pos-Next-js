import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pingRedis } from "@/lib/redis";

export const dynamic = "force-dynamic";

type HealthResponse = {
  ok: boolean;
  database: "connected" | "disconnected";
  redis: "connected" | "disabled" | "error";
  version: string;
  timestamp: string;
  uptime: number;
};

export async function GET() {
  const version = process.env.npm_package_version ?? "0.1.0";
  const timestamp = new Date().toISOString();

  try {
    const [, redis] = await Promise.all([prisma.$queryRaw`SELECT 1`, pingRedis()]);
    return NextResponse.json(
      {
        ok: true,
        database: "connected",
        redis,
        version,
        timestamp,
        uptime: Math.round(process.uptime()),
      } satisfies HealthResponse,
      { headers: { "cache-control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      {
        ok: false,
        database: "disconnected",
        redis: await pingRedis(),
        version,
        timestamp,
        uptime: Math.round(process.uptime()),
      } satisfies HealthResponse,
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }
}

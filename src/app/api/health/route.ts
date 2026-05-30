import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type HealthResponse = {
  ok: boolean;
  database: "connected" | "disconnected";
  version: string;
  timestamp: string;
  uptime: number;
};

export async function GET() {
  const version = process.env.npm_package_version ?? "0.1.0";
  const timestamp = new Date().toISOString();

  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json(
      {
        ok: true,
        database: "connected",
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
        version,
        timestamp,
        uptime: Math.round(process.uptime()),
      } satisfies HealthResponse,
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }
}

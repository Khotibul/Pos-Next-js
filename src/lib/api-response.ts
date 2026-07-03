import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { isAppError } from "@/lib/errors";

type ApiHandler<Args extends unknown[]> = (...args: Args) => Promise<Response>;

export function apiOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, { headers: { "cache-control": "no-store", ...init?.headers }, status: init?.status });
}

export function apiMessage(message: string, init?: ResponseInit) {
  return NextResponse.json({ ok: true, message }, { headers: { "cache-control": "no-store", ...init?.headers }, status: init?.status });
}

export function apiError(error: unknown) {
  if (isAppError(error)) {
    return NextResponse.json({ ok: false, code: error.code, message: error.message }, { status: error.status, headers: { "cache-control": "no-store" } });
  }

  if (error instanceof ZodError) {
    return NextResponse.json({ ok: false, code: "VALIDATION_ERROR", message: "Data tidak valid.", issues: error.issues }, { status: 400, headers: { "cache-control": "no-store" } });
  }

  const message = process.env.NODE_ENV === "production" ? "Terjadi gangguan server." : error instanceof Error ? error.message : "Terjadi gangguan server.";
  console.error("[api:error]", error);
  return NextResponse.json({ ok: false, code: "INTERNAL_SERVER_ERROR", message }, { status: 500, headers: { "cache-control": "no-store" } });
}

export function withApiHandler<Args extends unknown[]>(handler: ApiHandler<Args>): ApiHandler<Args> {
  return async (...args: Args) => {
    try {
      return await handler(...args);
    } catch (error) {
      return apiError(error);
    }
  };
}
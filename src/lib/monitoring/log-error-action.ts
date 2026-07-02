"use server";

import { writeErrorLog } from "@/lib/monitoring/log-service";

export async function logErrorAction(input: {
  source: string;
  message: string;
  stack?: string | null;
}) {
  try {
    await writeErrorLog({
      source: input.source,
      message: input.message,
      stack: input.stack ?? null,
    });
  } catch {
    // silently fail - logging should never break the app
  }
}

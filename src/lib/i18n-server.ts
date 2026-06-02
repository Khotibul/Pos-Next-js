import "server-only";

import { cookies } from "next/headers";
import { LANGUAGE_COOKIE, normalizeLocale, type Locale } from "@/lib/i18n";

export async function getRequestLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  return normalizeLocale(cookieStore.get(LANGUAGE_COOKIE)?.value);
}

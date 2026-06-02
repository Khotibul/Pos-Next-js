"use client";

import { useEffect, useState } from "react";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { LANGUAGE_COOKIE, normalizeLocale, type Locale } from "@/lib/i18n";

function readLocaleFromCookie(): Locale {
  if (typeof document === "undefined") return "id";
  const value = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${LANGUAGE_COOKIE}=`))
    ?.split("=")[1];
  return normalizeLocale(value);
}

export function PublicLanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const [locale, setLocale] = useState<Locale>("id");

  useEffect(() => {
    setLocale(readLocaleFromCookie());
  }, []);

  return (
    <div className={compact ? "w-full" : undefined}>
      <LanguageSwitcher
        locale={locale}
        label={locale === "en" ? "Language" : "Bahasa"}
        description={locale === "en" ? "Choose display language." : "Pilih bahasa tampilan."}
        activeLabel={locale === "en" ? "Active" : "Aktif"}
      />
    </div>
  );
}

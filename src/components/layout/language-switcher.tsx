"use client";

import { useRouter } from "next/navigation";
import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LANGUAGE_COOKIE, LOCALES, languageNames, type Locale } from "@/lib/i18n";

export function LanguageSwitcher({
  locale,
  label = "Bahasa",
  description = "Pilih bahasa tampilan.",
  activeLabel = "Aktif",
}: {
  locale: Locale;
  label?: string;
  description?: string;
  activeLabel?: string;
}) {
  const router = useRouter();

  function setLocale(nextLocale: Locale) {
    document.cookie = `${LANGUAGE_COOKIE}=${nextLocale}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" className="h-10 gap-2 rounded-2xl px-3 font-semibold">
          <Languages className="h-4 w-4" />
          <span>{languageNames[locale].short}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 rounded-2xl">
        <DropdownMenuLabel>
          <div>{label}</div>
          <div className="mt-1 text-xs font-normal text-muted-foreground">{description}</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {LOCALES.map((item) => (
          <DropdownMenuItem
            key={item}
            className="rounded-xl"
            onSelect={() => setLocale(item)}
          >
            <span className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-xl bg-muted text-xs font-bold">
              {languageNames[item].short}
            </span>
            <span className="flex-1">{languageNames[item].nativeLabel}</span>
            {item === locale ? <span className="text-xs text-primary">{activeLabel}</span> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

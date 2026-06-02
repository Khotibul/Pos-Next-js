"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Preset = "today" | "7d" | "month" | "custom";

function toIsoDateOnly(dateOnly: string) {
  // dateOnly format: YYYY-MM-DD
  // Keep it as date-only in query params to avoid timezone surprises.
  return dateOnly;
}

export function RangeTabs() {
  const router = useRouter();
  const pathname = usePathname() ?? "/reports";
  const searchParams = useSearchParams();
  const sp = useMemo(() => new URLSearchParams(searchParams?.toString() ?? ""), [searchParams]);
  const preset = (sp.get("preset") as Preset) || "7d";
  const [from, setFrom] = useState(sp.get("from") ?? "");
  const [to, setTo] = useState(sp.get("to") ?? "");

  const opts = useMemo(
    () =>
      [
        { k: "today" as const, label: "Hari Ini" },
        { k: "7d" as const, label: "7 Hari Terakhir" },
        { k: "month" as const, label: "Bulan Ini" },
        { k: "custom" as const, label: "Kustom" },
      ] as const,
    []
  );

  function push(next: URLSearchParams) {
    router.push(`${pathname}?${next.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border bg-background p-1">
        {opts.map((o) => {
          const active = preset === o.k;
          return (
            <Button
              key={o.k}
              type="button"
              size="sm"
              variant={active ? "default" : "ghost"}
              className={cn("rounded-xl", !active && "text-muted-foreground")}
              onClick={() => {
                const next = new URLSearchParams(sp.toString());
                next.set("preset", o.k);
                next.delete("page");
                if (o.k !== "custom") {
                  next.delete("from");
                  next.delete("to");
                }
                push(next);
              }}
            >
              {o.label}
            </Button>
          );
        })}
      </div>

      {preset === "custom" ? (
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="h-10 rounded-xl border bg-background px-3 text-sm"
          />
          <span className="text-sm text-muted-foreground">—</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="h-10 rounded-xl border bg-background px-3 text-sm"
          />
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            onClick={() => {
              const next = new URLSearchParams(sp.toString());
              next.set("preset", "custom");
              next.delete("page");
              if (from) next.set("from", toIsoDateOnly(from));
              if (to) next.set("to", toIsoDateOnly(to));
              push(next);
            }}
          >
            Terapkan
          </Button>
        </div>
      ) : null}
    </div>
  );
}

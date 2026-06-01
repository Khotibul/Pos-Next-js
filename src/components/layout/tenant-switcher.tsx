"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export type TenantOption = { tenantId: string; tenantName: string; tenantStatus: string };

export function TenantSwitcher({
  options,
  currentTenantId,
}: {
  options: TenantOption[];
  currentTenantId: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(currentTenantId);
  const [isLoading, setIsLoading] = useState(false);

  async function onChange(next: string) {
    setValue(next);
    setIsLoading(true);
    const res = await fetch("/api/tenant/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantId: next }),
    });
    setIsLoading(false);
    if (!res.ok) return;
    router.refresh();
  }

  return (
    <div className="flex w-full items-center gap-2">
      <select
        className="h-10 min-w-0 flex-1 rounded-2xl border bg-background/90 px-3 text-sm font-semibold tracking-[-0.01em] outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring dark:bg-background/80"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={isLoading}
      >
        {options.map((t) => (
          <option key={t.tenantId} value={t.tenantId}>
            {t.tenantName} ({t.tenantStatus})
          </option>
        ))}
      </select>
      <Button type="button" variant="ghost" size="sm" className="h-10 rounded-2xl px-3 text-xs font-semibold" onClick={() => router.refresh()} disabled={isLoading}>
        Refresh
      </Button>
    </div>
  );
}

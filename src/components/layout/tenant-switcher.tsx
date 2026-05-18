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
    <div className="flex items-center gap-2">
      <select
        className="h-9 rounded-md border bg-background px-2 text-sm"
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
      <Button type="button" variant="ghost" size="sm" onClick={() => router.refresh()} disabled={isLoading}>
        Refresh
      </Button>
    </div>
  );
}


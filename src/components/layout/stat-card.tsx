import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function formatPct(value: number) {
  const n = Number.isFinite(value) ? value : 0;
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
}

export function StatCard({
  icon,
  title,
  value,
  deltaPct,
  deltaTone = "auto",
  className,
}: {
  icon: ReactNode;
  title: string;
  value: ReactNode;
  deltaPct?: number;
  deltaTone?: "auto" | "positive" | "negative" | "neutral";
  className?: string;
}) {
  const tone =
    deltaTone === "auto"
      ? deltaPct == null
        ? "neutral"
        : deltaPct >= 0
          ? "positive"
          : "negative"
      : deltaTone;

  return (
    <Card className={cn("rounded-2xl", className)}>
      <CardContent className="grid gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary">{icon}</div>
          {deltaPct != null ? (
            <Badge
              variant="secondary"
              className={cn(
                "rounded-full px-2 py-1 text-xs",
                tone === "positive" && "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
                tone === "negative" && "bg-red-500/15 text-red-700 dark:text-red-300"
              )}
            >
              {formatPct(deltaPct)}
            </Badge>
          ) : null}
        </div>
        <div className="text-sm text-muted-foreground">{title}</div>
        <div className="text-3xl font-semibold tracking-tight">{value}</div>
      </CardContent>
    </Card>
  );
}


import { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
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
  description,
  deltaPct,
  deltaTone = "auto",
  tone,
  className,
}: {
  icon?: ReactNode;
  title: string;
  value: ReactNode;
  description?: ReactNode;
  deltaPct?: number;
  deltaTone?: "auto" | "positive" | "negative" | "neutral";
  tone?: "primary" | "success" | "warning" | "danger" | "slate";
  className?: string;
}) {
  const deltaVisualTone =
    deltaTone === "auto"
      ? deltaPct == null
        ? "neutral"
        : deltaPct >= 0
          ? "positive"
          : "negative"
      : deltaTone;
  const visualTone =
    deltaPct != null || deltaTone !== "auto"
      ? deltaVisualTone === "positive"
        ? "success"
        : deltaVisualTone === "negative"
          ? "danger"
          : deltaVisualTone === "neutral"
            ? "slate"
            : undefined
      : undefined;
  const cardTone = visualTone ?? tone ?? "primary";
  const toneClass = {
    primary: {
      card: "border-primary/15 bg-gradient-to-br from-background via-background to-primary/5",
      icon: "bg-primary/10 text-primary ring-primary/10",
      glow: "bg-primary/15",
    },
    success: {
      card: "border-emerald-500/15 bg-gradient-to-br from-background via-background to-emerald-500/5",
      icon: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/10 dark:text-emerald-300",
      glow: "bg-emerald-500/15",
    },
    warning: {
      card: "border-amber-500/20 bg-gradient-to-br from-background via-background to-amber-500/5",
      icon: "bg-amber-500/12 text-amber-700 ring-amber-500/10 dark:text-amber-300",
      glow: "bg-amber-500/15",
    },
    danger: {
      card: "border-rose-500/20 bg-gradient-to-br from-background via-background to-rose-500/5",
      icon: "bg-rose-500/12 text-rose-700 ring-rose-500/10 dark:text-rose-300",
      glow: "bg-rose-500/15",
    },
    slate: {
      card: "border-border bg-gradient-to-br from-background via-background to-muted/30",
      icon: "bg-muted text-muted-foreground ring-border",
      glow: "bg-muted-foreground/10",
    },
  } satisfies Record<string, { card: string; icon: string; glow: string }>;
  const DeltaIcon = deltaPct == null ? null : deltaPct > 0 ? ArrowUpRight : deltaPct < 0 ? ArrowDownRight : Minus;

  return (
    <Card
      className={cn(
        "group relative overflow-hidden rounded-[1.4rem] shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
        toneClass[cardTone].card,
        className
      )}
    >
      <div className={cn("pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full blur-2xl transition group-hover:scale-125", toneClass[cardTone].glow)} />
      <CardContent className="relative grid gap-4 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          {icon ? (
            <div className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-2xl ring-1", toneClass[cardTone].icon)}>{icon}</div>
          ) : null}
          {deltaPct != null ? (
            <Badge
              variant="secondary"
              className={cn(
                "gap-1 rounded-full px-2.5 py-1 text-xs font-semibold shadow-sm",
                deltaVisualTone === "positive" && "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
                deltaVisualTone === "negative" && "bg-red-500/15 text-red-700 dark:text-red-300",
                deltaVisualTone === "neutral" && "bg-muted text-muted-foreground"
              )}
            >
              {DeltaIcon ? <DeltaIcon className="h-3.5 w-3.5" /> : null}
              {formatPct(deltaPct)}
            </Badge>
          ) : null}
        </div>
        <div className="grid gap-1">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground sm:text-[0.8rem]">{title}</div>
          <div className="break-words text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{value}</div>
          {description ? <div className="text-xs leading-relaxed text-muted-foreground">{description}</div> : null}
        </div>
      </CardContent>
    </Card>
  );
}

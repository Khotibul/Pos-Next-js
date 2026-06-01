import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function ShiftSummaryCard({
  title,
  value,
  tone = "default",
}: {
  title: string;
  value: string;
  tone?: "default" | "primary" | "danger";
}) {
  const cls =
    tone === "primary"
      ? "border-primary/20 bg-gradient-to-br from-background via-background to-primary/10"
      : tone === "danger"
        ? "border-destructive/25 bg-gradient-to-br from-background via-background to-destructive/10"
        : "bg-gradient-to-br from-background via-background to-muted/30";
  return (
    <Card className={cn("group relative overflow-hidden rounded-[1.4rem] shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md", cls)}>
      <div
        className={cn(
          "pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full blur-2xl transition group-hover:scale-125",
          tone === "primary" ? "bg-primary/15" : tone === "danger" ? "bg-destructive/15" : "bg-muted-foreground/10"
        )}
      />
      <CardContent className="relative grid gap-2 p-4 sm:p-5">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground sm:text-[0.8rem]">{title}</div>
        <div className={cn("break-words text-2xl font-bold tracking-tight sm:text-3xl", tone === "primary" && "text-primary", tone === "danger" && "text-destructive")}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

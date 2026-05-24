import { Card, CardContent } from "@/components/ui/card";

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
      ? "border-primary/30 bg-primary/5"
      : tone === "danger"
        ? "border-destructive/30 bg-destructive/5"
        : "";
  return (
    <Card className={`rounded-2xl ${cls}`}>
      <CardContent className="grid gap-1 py-5">
        <div className="text-sm text-muted-foreground">{title}</div>
        <div className={`text-2xl font-semibold tracking-tight ${tone === "primary" ? "text-primary" : tone === "danger" ? "text-destructive" : ""}`}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}


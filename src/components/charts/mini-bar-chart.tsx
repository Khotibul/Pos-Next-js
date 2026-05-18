import { cn } from "@/lib/utils";

export function MiniBarChart({
  data,
  className,
}: {
  data: Array<{ label: string; value: number }>;
  className?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className={cn("flex h-40 items-end gap-2 rounded-2xl bg-muted/15 p-4", className)}>
      {data.length === 0 ? (
        <div className="text-sm text-muted-foreground">Belum ada data.</div>
      ) : (
        data.map((d) => (
          <div key={d.label} className="flex flex-1 flex-col items-center gap-2">
            <div className="w-full rounded-xl bg-primary/15">
              <div
                className="w-full rounded-xl bg-primary/60"
                style={{ height: `${Math.max(6, Math.round((d.value / max) * 120))}px` }}
                aria-label={`${d.label}: ${d.value}`}
              />
            </div>
            <div className="text-[10px] text-muted-foreground">{d.label}</div>
          </div>
        ))
      )}
    </div>
  );
}


import { Badge } from "@/components/ui/badge";

export function ChangelogList({ version, items }: { version: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="rounded-2xl border bg-background p-4">
      <div className="mb-3 flex items-center gap-2">
        <div className="text-sm font-semibold">Changelog</div>
        <Badge variant="secondary">{version}</Badge>
      </div>
      <ul className="space-y-2 text-sm text-muted-foreground">
        {items.map((t) => (
          <li key={t} className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
            <span className="leading-relaxed">{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}


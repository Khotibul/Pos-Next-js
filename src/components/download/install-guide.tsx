export function InstallGuide({ title, steps }: { title: string; steps: string[] }) {
  return (
    <div className="rounded-2xl border bg-background p-4">
      <div className="mb-3 text-sm font-semibold">{title}</div>
      <ol className="space-y-2 text-sm text-muted-foreground">
        {steps.map((s, idx) => (
          <li key={s} className="flex gap-3">
            <div className="mt-0.5 grid h-6 w-6 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              {idx + 1}
            </div>
            <div className="leading-relaxed">{s}</div>
          </li>
        ))}
      </ol>
    </div>
  );
}


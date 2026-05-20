import { code128Svg } from "@/lib/barcode/code128";

export function Code128Mark({
  value,
  label,
  height = 36,
  moduleWidth = 2,
  className,
}: {
  value: string | null | undefined;
  label?: string | null;
  height?: number;
  moduleWidth?: number;
  className?: string;
}) {
  const v = (value ?? "").trim();
  if (!v) return <span className={className ?? "text-xs text-muted-foreground"}>-</span>;

  const svg = code128Svg(v, { height, moduleWidth, quietZone: 8 });

  return (
    <div className={className}>
      <svg
        width={svg.width}
        height={svg.height}
        viewBox={`0 0 ${svg.width} ${svg.height}`}
        role="img"
        aria-label={label ?? `Barcode ${v}`}
        className="max-w-full"
        preserveAspectRatio="none"
      >
        <rect x="0" y="0" width={svg.width} height={svg.height} fill="white" />
        {svg.rects.map((r, idx) => (
          <rect key={idx} x={r.x} y="0" width={r.w} height={svg.height} fill="black" />
        ))}
      </svg>
      <div className="mt-1 text-center font-mono text-[10px] text-muted-foreground">{label ?? v}</div>
    </div>
  );
}


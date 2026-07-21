// Tiny dependency-free SVG sparkline for KPI cards. Deterministic output.

export function Sparkline({
  data,
  className,
  width = 96,
  height = 32,
  strokeClass = "stroke-primary",
  fillClass = "fill-primary/10",
}: {
  data: number[];
  className?: string;
  width?: number;
  height?: number;
  strokeClass?: string;
  fillClass?: string;
}) {
  if (data.length === 0) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const step = data.length > 1 ? width / (data.length - 1) : 0;
  const pad = 3;
  const h = height - pad * 2;

  const points = data.map((v, i) => {
    const x = i * step;
    const y = pad + h - ((v - min) / range) * h;
    return [x, y] as const;
  });

  const line = points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");
  const area = `${line} L${width},${height} L0,${height} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={className}
      preserveAspectRatio="none"
      aria-hidden
    >
      <path d={area} className={fillClass} stroke="none" />
      <path
        d={line}
        fill="none"
        className={strokeClass}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

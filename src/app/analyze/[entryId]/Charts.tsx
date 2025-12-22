type SeriesPoint = { x: number; y: number };

function scaleLinear(domainMin: number, domainMax: number, rangeMin: number, rangeMax: number) {
  const d = domainMax - domainMin || 1;
  const r = rangeMax - rangeMin;
  return (v: number) => rangeMin + ((v - domainMin) / d) * r;
}

function toPath(points: Array<{ x: number; y: number }>) {
  if (!points.length) return '';
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
}

export function SparklineCard({
  title,
  subtitle,
  series,
  invertY = false,
  formatY,
}: {
  title: string;
  subtitle?: string;
  series: SeriesPoint[];
  invertY?: boolean;
  formatY?: (y: number) => string;
}) {
  const w = 640;
  const h = 160;
  const padX = 12;
  const padY = 14;

  if (!series.length) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-slate-900">{title}</div>
            {subtitle ? <div className="mt-1 text-xs text-slate-500">{subtitle}</div> : null}
          </div>
          <div className="text-sm font-semibold text-slate-900">-</div>
        </div>
        <div className="mt-4 flex h-40 items-center justify-center overflow-hidden rounded-xl border border-slate-100 bg-slate-50 text-sm text-slate-600">
          No data available.
        </div>
      </div>
    );
  }

  const xs = series.map(p => p.x);
  const ys = series.map(p => p.y);

  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);

  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);

  const sx = scaleLinear(xMin, xMax, padX, w - padX);

  const sy = invertY
    ? scaleLinear(yMin, yMax, h - padY, padY)
    : scaleLinear(yMin, yMax, padY, h - padY);

  const pts = series.map(p => ({ x: sx(p.x), y: sy(p.y) }));
  const path = toPath(pts);

  const lastY = series[series.length - 1]?.y ?? 0;
  const label = formatY ? formatY(lastY) : `${lastY}`;

  const yMinLabel = formatY ? formatY(yMin) : `${yMin}`;
  const yMaxLabel = formatY ? formatY(yMax) : `${yMax}`;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-slate-900">{title}</div>
          {subtitle ? <div className="mt-1 text-xs text-slate-500">{subtitle}</div> : null}
        </div>
        <div className="text-sm font-semibold text-slate-900">{label}</div>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
        <svg viewBox={`0 0 ${w} ${h}`} className="h-40 w-full">
          <path d={path} fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-900" />
          <path
            d={`${path} L ${w - padX} ${h - padY} L ${padX} ${h - padY} Z`}
            fill="currentColor"
            className="text-slate-900/10"
          />
        </svg>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
        <div>{`GW ${xMin}`}</div>
        <div>{`GW ${xMax}`}</div>
      </div>

      <div className="mt-1 text-[11px] text-slate-500">{`Range: ${yMinLabel} → ${yMaxLabel}`}</div>
    </div>
  );
}

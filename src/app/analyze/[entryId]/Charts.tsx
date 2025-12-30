'use client';

import React, { useMemo, useRef, useState } from 'react';

type SeriesPoint = { x: number; y: number };
type FormatKind = 'rank' | 'int' | 'raw';

function scaleLinear(domainMin: number, domainMax: number, rangeMin: number, rangeMax: number) {
  const d = domainMax - domainMin || 1;
  const r = rangeMax - rangeMin;
  return (v: number) => rangeMin + ((v - domainMin) / d) * r;
}

function toPath(points: Array<{ x: number; y: number }>) {
  if (!points.length) return '';
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function formatValue(kind: FormatKind, n: number) {
  if (!Number.isFinite(n)) return '-';
  if (kind === 'rank') {
    if (n <= 0) return '-';
    return Math.round(n).toLocaleString();
  }
  if (kind === 'int') return Math.round(n).toLocaleString();
  return String(n);
}

export function SparklineCard({
  title,
  subtitle,
  series,
  invertY = false,
  format = 'raw',
}: {
  title: string;
  subtitle?: string;
  series: SeriesPoint[];
  invertY?: boolean;
  format?: FormatKind;
}) {
  const w = 640;
  const h = 160;
  const padX = 12;
  const padY = 14;

  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [hovering, setHovering] = useState(false);

  const idSafe = useMemo(() => title.replace(/[^a-z0-9]+/gi, '-').toLowerCase(), [title]);

  // Compute geometry even if empty; return null when empty.
  const computed = useMemo(() => {
    if (!series.length) return null;

    const xs = series.map((p) => p.x);
    const ys = series.map((p) => p.y);

    const xMin = Math.min(...xs);
    const xMax = Math.max(...xs);

    const yMin = Math.min(...ys);
    const yMax = Math.max(...ys);

    const sx = scaleLinear(xMin, xMax, padX, w - padX);

    // Normal: low values (e.g., 0) should be near bottom => larger pixel y.
    // That means mapping yMin -> (h - padY) and yMax -> padY.
    // invertY flips that (useful for rank: lower is better => visually higher).
    const sy = invertY
      ? scaleLinear(yMin, yMax, padY, h - padY) // yMin at top, yMax at bottom
      : scaleLinear(yMin, yMax, h - padY, padY); // yMin at bottom, yMax at top

    const pts = series.map((p) => ({ x: sx(p.x), y: sy(p.y) }));
    const path = toPath(pts);

    const lastY = series[series.length - 1]?.y ?? 0;
    const label = formatValue(format, lastY);

    const yMinLabel = formatValue(format, yMin);
    const yMaxLabel = formatValue(format, yMax);

    return { xMin, xMax, yMinLabel, yMaxLabel, pts, path, label };
  }, [series, invertY, format]);

  const hasData = !!computed && series.length > 0;

  const pts = computed?.pts ?? [];
  const path = computed?.path ?? '';
  const xMin = computed?.xMin ?? 0;
  const xMax = computed?.xMax ?? 0;
  const yMinLabel = computed?.yMinLabel ?? '-';
  const yMaxLabel = computed?.yMaxLabel ?? '-';
  const label = computed?.label ?? '-';

  const activeIdx = hasData && hoverIdx != null ? clamp(hoverIdx, 0, pts.length - 1) : null;
  const activePt = activeIdx != null ? pts[activeIdx] : null;
  const activeVal = activeIdx != null ? series[activeIdx] : null;

  function pickNearestIndex(clientX: number) {
    if (!svgRef.current || !hasData) return null;
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * w;

    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < pts.length; i++) {
      const d = Math.abs(pts[i].x - x);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    return best;
  }

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    const idx = pickNearestIndex(e.clientX);
    if (idx == null) return;
    setHoverIdx(idx);
    setHovering(true);
  }

  function onLeave() {
    setHovering(false);
    setHoverIdx(null);
  }

  // IMPORTANT: hooks must not be after an early return.
  const tooltip = useMemo(() => {
    if (!hasData || !activePt || !activeVal) return null;

    const tipW = 180;
    const tipH = 60;

    const x = clamp(activePt.x - tipW / 2, padX, w - padX - tipW);
    const y = clamp(activePt.y - tipH - 12, padY, h - padY - tipH);

    return { x, y, xLabel: `GW ${activeVal.x}`, yLabel: formatValue(format, activeVal.y) };
  }, [hasData, activePt, activeVal, format]);

  if (!hasData) {
    return (
      <div className="relative rounded-2xl border border-slate-200 bg-white/85 shadow-sm ring-1 ring-emerald-200/70">
        <div className="pointer-events-none absolute -top-10 right-10 h-44 w-44 rounded-full bg-emerald-300/25 blur-3xl" />
        <div className="rounded-2xl border-b border-slate-100 bg-gradient-to-br from-emerald-50 via-white to-white px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-slate-900">{title}</div>
              {subtitle ? <div className="mt-1 text-xs text-slate-600">{subtitle}</div> : null}
            </div>
            <div className="text-sm font-semibold text-slate-900">-</div>
          </div>
        </div>
        <div className="p-6 pt-5">
          <div className="flex h-40 items-center justify-center overflow-hidden rounded-xl border border-slate-100 bg-gradient-to-b from-slate-50 to-white text-sm text-slate-600">
            No data available.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative rounded-2xl border border-slate-200 bg-white/85 shadow-sm ring-1 ring-emerald-200/70">
      <div className="pointer-events-none absolute -top-10 right-10 h-44 w-44 rounded-full bg-emerald-300/25 blur-3xl" />

      <div className="rounded-2xl border-b border-slate-100 bg-gradient-to-br from-emerald-50 via-white to-white px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-slate-900">{title}</div>
            {subtitle ? <div className="mt-1 text-xs text-slate-600">{subtitle}</div> : null}
          </div>
          <div className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
            {label}
          </div>
        </div>
      </div>

      <div className="p-6 pt-5">
        <div className="relative overflow-hidden rounded-xl border border-slate-100 bg-gradient-to-b from-emerald-50/70 to-white">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${w} ${h}`}
            className="h-40 w-full"
            onMouseMove={onMove}
            onMouseEnter={() => setHovering(true)}
            onMouseLeave={onLeave}
            role="img"
            aria-label={title}
          >
            <defs>
              <linearGradient id={`fill-${idSafe}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="currentColor" stopOpacity="0.22" />
                <stop offset="100%" stopColor="currentColor" stopOpacity="0.02" />
              </linearGradient>
              <filter id={`soft-${idSafe}`} x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="1.4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <g>
              <line x1={padX} y1={h - padY} x2={w - padX} y2={h - padY} className="stroke-emerald-200/50" strokeWidth={1.2} />
              <line x1={padX} y1={padY} x2={w - padX} y2={padY} className="stroke-emerald-200/50" strokeWidth={1.2} />
            </g>

            <path
              d={`${path} L ${w - padX} ${h - padY} L ${padX} ${h - padY} Z`}
              fill={`url(#fill-${idSafe})`}
              className="text-emerald-700"
            />

            <path d={path} fill="none" stroke="currentColor" strokeWidth="3" className="text-emerald-700" filter={`url(#soft-${idSafe})`} />

            {hovering && activePt ? (
              <g className="text-emerald-700">
                <line x1={activePt.x} y1={padY} x2={activePt.x} y2={h - padY} stroke="currentColor" strokeWidth="1.5" className="text-emerald-700/35" />
                <circle cx={activePt.x} cy={activePt.y} r="10" fill="currentColor" className="text-emerald-600/18" />
                <circle cx={activePt.x} cy={activePt.y} r="5" fill="currentColor" />
              </g>
            ) : null}

            {hovering && tooltip ? (
              <g>
                <rect x={tooltip.x} y={tooltip.y} width={180} height={60} rx={14} fill="white" opacity={0.98} stroke="#d1fae5" strokeWidth={1} />
                <text x={tooltip.x + 12} y={tooltip.y + 23} fontSize={12} fill="#0f172a" fontWeight={700}>
                  {tooltip.xLabel}
                </text>
                <text x={tooltip.x + 12} y={tooltip.y + 44} fontSize={12} fill="#065f46" fontWeight={700}>
                  {tooltip.yLabel}
                </text>
              </g>
            ) : null}

            <rect x={0} y={0} width={w} height={h} fill="transparent" />
          </svg>
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-slate-600">
          <div className="rounded-full border border-slate-200 bg-white/70 px-3 py-1.5">{`GW ${xMin}`}</div>
          <div className="rounded-full border border-slate-200 bg-white/70 px-3 py-1.5">{`GW ${xMax}`}</div>
        </div>

        <div className="mt-2 text-[11px] text-slate-600">{`Range ${yMinLabel} to ${yMaxLabel}`}</div>
      </div>
    </div>
  );
}

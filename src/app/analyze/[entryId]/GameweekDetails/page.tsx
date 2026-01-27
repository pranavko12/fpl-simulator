import Link from 'next/link';
import Navbar from '../../../components/Navbar';
import { fplFetch, fplFetchOrNull } from '../../../lib/fpl/client';
import type { FplBootstrapStatic, FplHistory, FplTransfer } from '../../../lib/fpl/types';

type LiveEvent = {
  elements: Array<{
    id: number;
    stats: { total_points: number };
  }>;
};

type PicksResponse = {
  entry_history?: { points: number; event_transfers_cost: number };
  picks: Array<{
    element: number;
    position: number;
    multiplier: number;
    is_captain: boolean;
    is_vice_captain: boolean;
  }>;
};

function formatRank(n: number) {
  if (!Number.isFinite(n) || n <= 0) return '-';
  return Math.round(n).toLocaleString();
}

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(' ');
}

function pickLabel(elementType: number) {
  if (elementType === 1) return 'GK';
  if (elementType === 2) return 'DEF';
  if (elementType === 3) return 'MID';
  if (elementType === 4) return 'FWD';
  return 'UNK';
}

function isValidFormation(counts: { gk: number; def: number; mid: number; fwd: number }) {
  if (counts.gk !== 1) return false;
  if (counts.def < 3 || counts.def > 5) return false;
  if (counts.mid < 2 || counts.mid > 5) return false;
  if (counts.fwd < 1 || counts.fwd > 3) return false;
  return counts.gk + counts.def + counts.mid + counts.fwd === 11;
}

function bestXIWithForcedCaptain(args: {
  squad: Array<{ id: number; type: number; pts: number }>;
  captainId: number;
}) {
  const { squad, captainId } = args;
  const ids = squad.map((s) => s.id);
  if (!ids.includes(captainId)) return null;

  let bestBase = -1;
  let bestIds: number[] = [];

  const n = squad.length;
  const forcedIdx = squad.findIndex((s) => s.id === captainId);

  for (let mask = 0; mask < 1 << n; mask++) {
    if (((mask >> forcedIdx) & 1) === 0) continue;
    let bits = 0;
    for (let i = 0; i < n; i++) bits += (mask >> i) & 1;
    if (bits !== 11) continue;

    const counts = { gk: 0, def: 0, mid: 0, fwd: 0 };
    let base = 0;
    const chosen: number[] = [];

    for (let i = 0; i < n; i++) {
      if (((mask >> i) & 1) === 0) continue;
      const p = squad[i];
      chosen.push(p.id);
      base += p.pts;
      if (p.type === 1) counts.gk += 1;
      else if (p.type === 2) counts.def += 1;
      else if (p.type === 3) counts.mid += 1;
      else if (p.type === 4) counts.fwd += 1;
    }

    if (!isValidFormation(counts)) continue;

    if (base > bestBase) {
      bestBase = base;
      bestIds = chosen;
    }
  }

  if (bestBase < 0) return null;
  return { basePoints: bestBase, xiIds: bestIds };
}

function StatCard({
  label,
  value,
  meta,
}: {
  label: string;
  value: string;
  meta?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">{value}</div>
      {meta ? <div className="mt-2 text-sm font-medium text-slate-600">{meta}</div> : null}
    </div>
  );
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-900">{title}</div>
          <div className="mt-1 text-xs text-slate-600">{subtitle}</div>
        </div>
      </div>
      {children}
    </div>
  );
}

function PlayerRow({
  name,
  role,
  points,
  pill,
  pillTone,
}: {
  name: string;
  role: string;
  points: number;
  pill?: string;
  pillTone?: 'emerald' | 'rose' | 'slate';
}) {
  const tone =
    pillTone === 'emerald'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
      : pillTone === 'rose'
      ? 'border-rose-200 bg-rose-50 text-rose-900'
      : 'border-slate-200 bg-slate-50 text-slate-800';

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <div className="truncate text-sm font-semibold text-slate-900">{name}</div>
          <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-600">
            {role}
          </span>
          {pill ? (
            <span className={cn('rounded-full border px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide', tone)}>
              {pill}
            </span>
          ) : null}
        </div>
      </div>
      <div className="flex items-baseline gap-2">
        <div className="text-lg font-extrabold text-slate-900">{points}</div>
        <div className="text-xs font-semibold text-slate-500">pts</div>
      </div>
    </div>
  );
}

export default async function GameweekDetails({
  params,
  searchParams,
}: {
  params: Promise<{ entryId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { entryId } = await params;
  const sp = (await searchParams) ?? {};
  const entryIdRaw = entryId?.trim();

  if (!entryIdRaw || !/^\d{1,10}$/.test(entryIdRaw)) {
    return (
      <>
        <Navbar />
        <main className="mx-auto max-w-3xl px-6 pt-28 pb-24">
          <h1 className="text-2xl font-extrabold text-slate-900">Invalid Entry ID</h1>
          <p className="mt-2 text-slate-600">Please enter a numeric FPL Entry ID.</p>
          <div className="mt-6">
            <Link
              href="/analyze"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <span aria-hidden className="text-lg leading-none">
                ←
              </span>
              Back
            </Link>
          </div>
        </main>
      </>
    );
  }

  const id = Number(entryIdRaw);

  let history: FplHistory;
  let transfers: FplTransfer[];
  let bootstrap: FplBootstrapStatic | null;

  try {
    [history, transfers, bootstrap] = await Promise.all([
      fplFetch<FplHistory>(`/entry/${id}/history/`, { revalidateSeconds: 300 }),
      fplFetch<FplTransfer[]>(`/entry/${id}/transfers/`, { revalidateSeconds: 300 }),
      fplFetchOrNull<FplBootstrapStatic>(`/bootstrap-static/`, { revalidateSeconds: 3600 }),
    ]);
  } catch {
    return (
      <>
        <Navbar />
        <main className="mx-auto max-w-3xl px-6 pt-28 pb-24">
          <h1 className="text-2xl font-extrabold text-slate-900">FPL data is temporarily unavailable</h1>
          <p className="mt-2 text-slate-600">Try again shortly. If it persists, the FPL servers may be under load.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={`/analyze/${id}`}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <span aria-hidden className="text-lg leading-none">
                ←
              </span>
              Back to entry analysis
            </Link>
          </div>
        </main>
      </>
    );
  }

  const current = history.current ?? [];
  const gwList = current.map((g) => g.event).sort((a, b) => a - b);

  const gwParam = sp.gw;
  const gwStr = Array.isArray(gwParam) ? gwParam[0] : gwParam;
  const gwFromQuery = gwStr && /^\d+$/.test(gwStr) ? Number(gwStr) : null;
  const gw = gwFromQuery && gwList.includes(gwFromQuery) ? gwFromQuery : (gwList.at(-1) ?? 1);

  let picksRes: PicksResponse;
  let live: LiveEvent;

  try {
    [picksRes, live] = await Promise.all([
      fplFetch<PicksResponse>(`/entry/${id}/event/${gw}/picks/`, { revalidateSeconds: 300 }),
      fplFetch<LiveEvent>(`/event/${gw}/live/`, { revalidateSeconds: 300 }),
    ]);
  } catch {
    return (
      <>
        <Navbar />
        <main className="mx-auto max-w-3xl px-6 pt-28 pb-24">
          <h1 className="text-2xl font-extrabold text-slate-900">Gameweek data is temporarily unavailable</h1>
          <p className="mt-2 text-slate-600">This endpoint often rate-limits. Try again shortly.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={`/analyze/${id}`}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <span aria-hidden className="text-lg leading-none">
                ←
              </span>
              Back to entry analysis
            </Link>
            <a
              href={`/analyze/${id}/GameweekDetails?gw=${gw}`}
              className="inline-flex items-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Retry
            </a>
          </div>
        </main>
      </>
    );
  }

  const pointsByElement = new Map<number, number>();
  for (const e of live.elements) pointsByElement.set(e.id, e.stats?.total_points ?? 0);

  const nameByElement = new Map<number, string>();
  const typeByElement = new Map<number, number>();
  if (bootstrap?.elements?.length) {
    for (const e of bootstrap.elements) {
      nameByElement.set(e.id, e.web_name);
      typeByElement.set(e.id, e.element_type);
    }
  }

  const picks = (picksRes.picks ?? []).slice().sort((a, b) => a.position - b.position);
  const starters = picks.filter((p) => p.position <= 11);
  const bench = picks.filter((p) => p.position > 11);

  const captainPick = picks.find((p) => p.is_captain) ?? null;
  const vicePick = picks.find((p) => p.is_vice_captain) ?? null;

  const captainId = captainPick?.element ?? 0;
  const captainPts = pointsByElement.get(captainId) ?? 0;

  const starterPtsSum = starters.reduce((acc, p) => acc + (pointsByElement.get(p.element) ?? 0), 0);
  const benchPtsSum = bench.reduce((acc, p) => acc + (pointsByElement.get(p.element) ?? 0), 0);

  const gwRowIdx = current.findIndex((g) => g.event === gw);
  const gwRow = gwRowIdx >= 0 ? current[gwRowIdx] : null;
  const prevRow = gwRowIdx > 0 ? current[gwRowIdx - 1] : null;

  const gwPoints = gwRow?.points ?? picksRes.entry_history?.points ?? 0;
  const gwRank = gwRow?.overall_rank ?? 0;
  const prevRank = prevRow?.overall_rank ?? 0;
  const rankDelta = gwRank && prevRank ? prevRank - gwRank : 0;

  const hitCost = picksRes.entry_history?.event_transfers_cost ?? 0;

  const captainDeltaCandidate = starters
    .filter((p) => p.element !== captainId)
    .map((p) => ({ id: p.element, pts: pointsByElement.get(p.element) ?? 0 }))
    .sort((a, b) => b.pts - a.pts)[0];

  const captainDelta = captainDeltaCandidate ? captainDeltaCandidate.pts - captainPts : 0;

  const squad = picks.map((p) => ({
    id: p.element,
    type: typeByElement.get(p.element) ?? 0,
    pts: pointsByElement.get(p.element) ?? 0,
  }));

  const bestXI = bestXIWithForcedCaptain({ squad, captainId });
  const actualBase = starterPtsSum;
  const optimalBase = bestXI?.basePoints ?? actualBase;
  const avoidableBenchPain = Math.max(0, optimalBase - actualBase);
  const benchPain = benchPtsSum;

  const transfersThisGw = (transfers ?? []).filter((t) => (t as any).event === gw);
  const transferAudit = transfersThisGw.map((t) => {
    const elementIn = (t as any).element_in as number;
    const elementOut = (t as any).element_out as number;
    const inPts = pointsByElement.get(elementIn) ?? 0;
    const outPts = pointsByElement.get(elementOut) ?? 0;
    const inName = nameByElement.get(elementIn) ?? `#${elementIn}`;
    const outName = nameByElement.get(elementOut) ?? `#${elementOut}`;
    return { inName, outName, inPts, outPts, net: inPts - outPts };
  });

  const transferNet = transferAudit.reduce((a, r) => a + r.net, 0) - hitCost;

  const verdicts: Array<{ title: string; tone: 'emerald' | 'rose' | 'slate'; body: string }> = [];

  if (captainDelta <= 0) {
    verdicts.push({
      title: 'Captaincy',
      tone: 'emerald',
      body: 'Captain choice did not leave obvious points on the table within your starting XI.',
    });
  } else {
    const bestName = nameByElement.get(captainDeltaCandidate!.id) ?? `#${captainDeltaCandidate!.id}`;
    const capName = nameByElement.get(captainId) ?? `#${captainId}`;
    verdicts.push({
      title: 'Captaincy',
      tone: 'rose',
      body: `Switching captain from ${capName} to ${bestName} would have gained +${captainDelta} points (hindsight).`,
    });
  }

  if (avoidableBenchPain <= 0) {
    verdicts.push({
      title: 'Lineup',
      tone: 'emerald',
      body: 'Starting XI was close to optimal under formation constraints (with your captain forced in).',
    });
  } else {
    verdicts.push({
      title: 'Lineup',
      tone: 'rose',
      body: `An alternative XI could have added +${avoidableBenchPain} points (hindsight), mainly due to bench decisions.`,
    });
  }

  if (!transfersThisGw.length) {
    verdicts.push({ title: 'Transfers', tone: 'slate', body: 'No transfers recorded for this gameweek.' });
  } else if (transferNet >= 0) {
    verdicts.push({
      title: 'Transfers',
      tone: 'emerald',
      body: `Transfers were net positive after hits: ${transferNet >= 0 ? '+' : ''}${transferNet} points (hindsight).`,
    });
  } else {
    verdicts.push({
      title: 'Transfers',
      tone: 'rose',
      body: `Transfers were net negative after hits: ${transferNet} points (hindsight).`,
    });
  }

  const gwNav = (
    <div className="flex flex-wrap items-center gap-2">
      {gwList.slice(-10).map((g) => (
        <Link
          key={g}
          href={`/analyze/${id}/GameweekDetails?gw=${g}`}
          className={cn(
            'rounded-full border px-3 py-1 text-xs font-semibold shadow-sm',
            g === gw ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          )}
        >
          GW {g}
        </Link>
      ))}
    </div>
  );

  const isCaptain = (element: number) => !!captainPick && captainPick.element === element;
  const isVice = (element: number) => !!vicePick && vicePick.element === element;

  const optimalIds = new Set<number>(bestXI?.xiIds ?? []);
  const actualIds = new Set<number>(starters.map((p) => p.element));
  const missedStarters = (bestXI?.xiIds ?? []).filter((eid) => !actualIds.has(eid));
  const wrongStarters = starters.map((p) => p.element).filter((eid) => !optimalIds.has(eid));

  const missed = missedStarters
    .map((eid) => ({ id: eid, pts: pointsByElement.get(eid) ?? 0 }))
    .sort((a, b) => b.pts - a.pts);

  const wrong = wrongStarters
    .map((eid) => ({ id: eid, pts: pointsByElement.get(eid) ?? 0 }))
    .sort((a, b) => a.pts - b.pts);

  const topSwap = missed.length && wrong.length ? { inId: missed[0].id, outId: wrong[0].id, delta: missed[0].pts - wrong[0].pts } : null;

  return (
    <>
      <Navbar />
      <main className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-28 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-emerald-200/40 blur-3xl" />
          <div className="absolute -bottom-32 left-[-120px] h-96 w-96 rounded-full bg-emerald-100/50 blur-3xl" />
        </div>

        <div className="mx-auto max-w-7xl px-6 pt-24 pb-20">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <Link
              href={`/analyze/${id}`}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur hover:bg-white"
            >
              <span aria-hidden className="text-lg leading-none">
                ←
              </span>
              Back to entry analysis
            </Link>
            {gwNav}
          </div>

          <header className="rounded-3xl border border-slate-200 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.10)]">
            <div className="border-b border-slate-100 px-6 py-6">
              <div className="flex flex-col gap-2">
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                  Gameweek analysis
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Entry {id}
                </div>

                <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">GW {gw} report</h1>

                <p className="text-sm text-slate-600">
                  Hindsight audit of captaincy, lineup, and transfers. Use it to improve process, not to punish variance.
                </p>
              </div>
            </div>

            <div className="px-6 py-6">
              <section className="grid gap-4 md:grid-cols-4">
                <StatCard label="GW points" value={`${gwPoints}`} meta={`Transfer hits: ${hitCost}`} />
                <StatCard
                  label="Overall rank"
                  value={formatRank(gwRank)}
                  meta={rankDelta ? `Rank delta: ${rankDelta > 0 ? '+' : ''}${formatRank(rankDelta)}` : 'Rank delta: -'}
                />
                <StatCard label="Bench points" value={`${benchPain}`} meta={`Avoidable: ${avoidableBenchPain}`} />
                <StatCard
                  label="Captain delta"
                  value={`${captainDelta > 0 ? '+' : ''}${captainDelta}`}
                  meta={captainDeltaCandidate ? `Best XI alternative: ${nameByElement.get(captainDeltaCandidate.id) ?? `#${captainDeltaCandidate.id}`}` : '—'}
                />
              </section>
            </div>
          </header>

          <section className="mt-6 grid gap-4 lg:grid-cols-3">
            <Panel title="Verdicts" subtitle="Executive summary of the GW decision audit">
              <div className="mt-4 space-y-3">
                {verdicts.map((v) => (
                  <div
                    key={v.title}
                    className={cn(
                      'rounded-2xl border p-4',
                      v.tone === 'emerald'
                        ? 'border-emerald-200 bg-emerald-50/60'
                        : v.tone === 'rose'
                        ? 'border-rose-200 bg-rose-50/60'
                        : 'border-slate-200 bg-slate-50'
                    )}
                  >
                    <div
                      className={cn(
                        'text-xs font-extrabold uppercase tracking-wide',
                        v.tone === 'emerald' ? 'text-emerald-900' : v.tone === 'rose' ? 'text-rose-900' : 'text-slate-700'
                      )}
                    >
                      {v.title}
                    </div>
                    <div className="mt-2 text-sm font-medium text-slate-800">{v.body}</div>
                  </div>
                ))}
              </div>

              {topSwap && topSwap.delta > 0 ? (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-xs font-extrabold uppercase tracking-wide text-slate-700">Most costly swap</div>
                  <div className="mt-2 text-sm font-semibold text-slate-900">
                    Start {nameByElement.get(topSwap.inId) ?? `#${topSwap.inId}`} instead of {nameByElement.get(topSwap.outId) ?? `#${topSwap.outId}`}
                    <span className="ml-2 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-rose-900">
                      +{topSwap.delta}
                    </span>
                  </div>
                </div>
              ) : null}
            </Panel>

            <Panel title="Starting XI" subtitle="Who you fielded (captain is doubled in FPL scoring)">
              <div className="mt-4 space-y-2">
                {starters.map((p) => {
                  const pts = pointsByElement.get(p.element) ?? 0;
                  const name = nameByElement.get(p.element) ?? `#${p.element}`;
                  const role = pickLabel(typeByElement.get(p.element) ?? 0);
                  const pill = isCaptain(p.element) ? 'C' : isVice(p.element) ? 'VC' : undefined;
                  const pillTone = isCaptain(p.element) ? 'emerald' : isVice(p.element) ? 'slate' : undefined;
                  return <PlayerRow key={p.element} name={name} role={role} points={pts} pill={pill} pillTone={pillTone} />;
                })}
              </div>

              {bestXI ? (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs font-extrabold uppercase tracking-wide text-slate-700">Optimal XI (forced captain)</div>
                    <div className="text-sm font-extrabold text-slate-900">
                      {optimalBase} <span className="text-xs font-semibold text-slate-500">base pts</span>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(bestXI.xiIds ?? [])
                      .map((eid) => ({ id: eid, pts: pointsByElement.get(eid) ?? 0 }))
                      .sort((a, b) => b.pts - a.pts)
                      .map((x) => {
                        const nm = nameByElement.get(x.id) ?? `#${x.id}`;
                        const inActual = actualIds.has(x.id);
                        return (
                          <span
                            key={x.id}
                            className={cn(
                              'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold',
                              inActual ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-rose-200 bg-rose-50 text-rose-900'
                            )}
                          >
                            <span className="max-w-[160px] truncate">{nm}</span>
                            <span className="font-extrabold">{x.pts}</span>
                          </span>
                        );
                      })}
                  </div>
                </div>
              ) : null}
            </Panel>

            <Panel title="Bench" subtitle="Bench order and points left out">
              <div className="mt-4 space-y-2">
                {bench.length ? (
                  bench.map((p, idx) => {
                    const pts = pointsByElement.get(p.element) ?? 0;
                    const name = nameByElement.get(p.element) ?? `#${p.element}`;
                    const role = pickLabel(typeByElement.get(p.element) ?? 0);
                    const pill = `B${idx + 1}`;
                    return <PlayerRow key={p.element} name={name} role={role} points={pts} pill={pill} pillTone="slate" />;
                  })
                ) : (
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">No bench data.</div>
                )}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-xs font-semibold text-slate-500">Bench points</div>
                  <div className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">{benchPain}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-xs font-semibold text-slate-500">Avoidable bench pain</div>
                  <div className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">{avoidableBenchPain}</div>
                </div>
              </div>
            </Panel>
          </section>

          <section className="mt-6 grid gap-4 lg:grid-cols-2">
            <Panel title="Transfer audit" subtitle="This GW only (incoming − outgoing − hits)">
              <div className="mt-4 space-y-3">
                {!transfersThisGw.length ? (
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">No transfers this gameweek.</div>
                ) : (
                  transferAudit.map((r, i) => (
                    <div key={`${r.outName}-${r.inName}-${i}`} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-extrabold text-slate-900">
                            {r.outName} → {r.inName}
                          </div>
                          <div className="mt-1 text-xs font-semibold text-slate-600">
                            Out: {r.outPts} pts · In: {r.inPts} pts
                          </div>
                        </div>
                        <div
                          className={cn(
                            'rounded-full border px-3 py-1 text-xs font-extrabold uppercase tracking-wide',
                            r.net >= 0 ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-rose-200 bg-rose-50 text-rose-900'
                          )}
                        >
                          {r.net >= 0 ? '+' : ''}
                          {r.net}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white p-4">
                <div>
                  <div className="text-xs font-semibold text-slate-500">Hit cost</div>
                  <div className="mt-1 text-lg font-extrabold text-slate-900">{hitCost}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-500">Net transfer delta</div>
                  <div className={cn('mt-1 text-lg font-extrabold', transferNet >= 0 ? 'text-emerald-700' : 'text-rose-700')}>
                    {transferNet >= 0 ? '+' : ''}
                    {transferNet}
                  </div>
                </div>
              </div>
            </Panel>

            <Panel title="Decision breakdown" subtitle="Clean heuristics, not narrative cope">
              <div className="mt-4 grid gap-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-xs font-extrabold uppercase tracking-wide text-slate-700">Captain</div>
                  <div className="mt-2 text-sm font-semibold text-slate-900">
                    {isCaptain(captainId) ? (nameByElement.get(captainId) ?? `#${captainId}`) : '—'}{' '}
                    <span className="ml-2 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-slate-800">
                      {captainPts} pts
                    </span>
                  </div>
                  <div className="mt-2 text-sm font-medium text-slate-700">
                    {captainDelta > 0 && captainDeltaCandidate
                      ? `Best alternative in XI: ${nameByElement.get(captainDeltaCandidate.id) ?? `#${captainDeltaCandidate.id}`} (+${captainDelta}).`
                      : 'No better captain within your starting XI this GW.'}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-xs font-extrabold uppercase tracking-wide text-slate-700">Lineup efficiency</div>
                  <div className="mt-2 text-sm font-medium text-slate-700">
                    Actual XI base: <span className="font-extrabold text-slate-900">{actualBase}</span> · Optimal base:{' '}
                    <span className="font-extrabold text-slate-900">{optimalBase}</span>
                  </div>
                  <div className="mt-2 text-sm font-medium text-slate-700">
                    {avoidableBenchPain > 0
                      ? `You left ~${avoidableBenchPain} avoidable points on the table under legal formations (forced captain).`
                      : 'You were basically at the ceiling under legal formations (forced captain).'}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-xs font-extrabold uppercase tracking-wide text-slate-700">Transfers</div>
                  <div className="mt-2 text-sm font-medium text-slate-700">
                    {transfersThisGw.length
                      ? `Net GW delta after hits: ${transferNet >= 0 ? '+' : ''}${transferNet}.`
                      : 'No transfers this GW, so no transfer-driven variance.'}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  href={`/analyze/${id}`}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  Back to entry analysis
                </Link>
                <a
                  href={`/analyze/${id}/GameweekDetails?gw=${gw}`}
                  className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Refresh
                </a>
              </div>
            </Panel>
          </section>
        </div>
      </main>
    </>
  );
}

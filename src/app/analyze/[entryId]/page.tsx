import Link from 'next/link';
import Navbar from '../../components/Navbar';
import { fplFetch, fplFetchOrNull } from '../../lib/fpl/client';
import type { FplBootstrapStatic, FplEntry, FplHistory, FplTransfer } from '../../lib/fpl/types';
import { fetchCaptainsForGws } from '../../lib/fpl/picks';
import { buildPredictionProfile } from '../../lib/fpl/profile';
import { SparklineCard } from './Charts';

function formatRank(n: number) {
  if (!Number.isFinite(n) || n <= 0) return '-';
  return Math.round(n).toLocaleString();
}

function mean(nums: number[]) {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function stddev(nums: number[]) {
  if (nums.length < 2) return 0;
  const m = mean(nums);
  return Math.sqrt(mean(nums.map((x) => (x - m) ** 2)));
}

function slope(xs: number[], ys: number[]) {
  if (xs.length !== ys.length || xs.length < 2) return 0;
  const xBar = mean(xs);
  const yBar = mean(ys);
  let num = 0;
  let den = 0;
  for (let i = 0; i < xs.length; i++) {
    num += (xs[i] - xBar) * (ys[i] - yBar);
    den += (xs[i] - xBar) ** 2;
  }
  return den === 0 ? 0 : num / den;
}

type SeasonSummary = {
  available: boolean;
  headline: string;
  bullets: string[];
  good: string[];
  bad: string[];
};

function buildSeasonSummary(history: FplHistory, profile: ReturnType<typeof buildPredictionProfile>): SeasonSummary {
  const current = history.current ?? [];
  if (current.length < 2) {
    return {
      available: false,
      headline: 'Not enough gameweeks to summarize trends yet.',
      bullets: [],
      good: [],
      bad: [],
    };
  }

  const gws = current.map((g) => g.event);
  const points = current.map((g) => g.points);
  const ranksLog = current.map((g) => Math.log(Math.max(1, g.overall_rank || 1)));

  const rankSlope = slope(gws, ranksLog);
  const improving = rankSlope < -0.01;
  const declining = rankSlope > 0.01;

  const volatility = stddev(points);
  const volBand = volatility >= 20 ? 'high' : volatility >= 14 ? 'moderate' : 'low';

  const bestIdx = points.indexOf(Math.max(...points));
  const worstIdx = points.indexOf(Math.min(...points));

  const recent = points.slice(-Math.min(5, points.length));
  const early = points.slice(0, Math.min(5, points.length));

  const good: string[] = [];
  const bad: string[] = [];

  if (improving && mean(recent) >= mean(points)) {
    good.push('Recent decisions are producing consistent rank gains.');
  }
  if (volBand === 'low' && profile.totalHitsPoints <= 8) {
    good.push('Low volatility with limited hits is helping long-term rank stability.');
  }
  if (mean(recent) > mean(early) + 5) {
    good.push('Scoring has improved noticeably compared to the opening weeks.');
  }

  if (profile.totalHitsPoints >= 16) {
    bad.push('Heavy hit usage has significantly reduced your season total.');
  }
  if (volBand === 'high') {
    bad.push('High week-to-week volatility is stalling sustained rank progress.');
  }
  if (profile.captainChanges >= Math.max(6, Math.floor(current.length * 0.6))) {
    bad.push('Frequent captain changes are increasing variance without clear payoff.');
  }
  if (profile.avgTransfersPerGw >= 1.6) {
    bad.push('High transfer volume suggests reactive decision-making.');
  }

  const last = current.at(-1);
  const lastPoints = points.at(-1) ?? 0;
  const lastRank = last?.overall_rank ?? 0;

  const headline = `${improving ? 'Rank improving' : declining ? 'Rank declining' : 'Rank flat'} · ${volBand} volatility`;

  return {
    available: true,
    headline,
    bullets: [
      `Latest GW: ${lastPoints} pts · Overall rank: ${formatRank(lastRank)}.`,
      `High point: GW ${current[bestIdx].event} (${points[bestIdx]} pts). Low point: GW ${current[worstIdx].event} (${points[worstIdx]} pts).`,
      `Season avg: ${mean(points).toFixed(1)} pts/GW · Last ${recent.length} avg: ${mean(recent).toFixed(1)} pts/GW.`,
      `Hits cost: ${profile.totalHitsPoints} pts · Captain changes: ${profile.captainChanges} · Avg transfers/GW: ${profile.avgTransfersPerGw.toFixed(
        2
      )}.`,
    ],
    good: good.slice(0, 2),
    bad: bad.slice(0, 2),
  };
}

export default async function AnalyzeEntryIdPage({
  params,
}: {
  params: Promise<{ entryId: string }>;
}) {
  const { entryId } = await params;
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
              <span aria-hidden className="text-lg leading-none">←</span>
              Back
            </Link>
          </div>
        </main>
      </>
    );
  }

  const id = Number(entryIdRaw);

  let entry: FplEntry;
  let history: FplHistory;
  let transfers: FplTransfer[];

  try {
    [entry, history, transfers] = await Promise.all([
      fplFetch<FplEntry>(`/entry/${id}/`, { revalidateSeconds: 300 }),
      fplFetch<FplHistory>(`/entry/${id}/history/`, { revalidateSeconds: 300 }),
      fplFetch<FplTransfer[]>(`/entry/${id}/transfers/`, { revalidateSeconds: 300 }),
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
              href="/analyze"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <span aria-hidden className="text-lg leading-none">←</span>
              Back
            </Link>
            <a
              href={`/analyze/${id}`}
              className="inline-flex items-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Retry
            </a>
          </div>
        </main>
      </>
    );
  }

  const gws = (history.current ?? []).map((g) => g.event);
  const captains = await fetchCaptainsForGws(id, gws, 6);

  const bootstrap = await fplFetchOrNull<FplBootstrapStatic>(`/bootstrap-static/`, { revalidateSeconds: 3600 });
  const elementName = new Map<number, string>();
  if (bootstrap?.elements?.length) for (const e of bootstrap.elements) elementName.set(e.id, e.web_name);

  const profile = buildPredictionProfile(entry, history, transfers, captains);
  const seasonSummary = buildSeasonSummary(history, profile);

  const pointsSeries = (history.current ?? []).map((g) => ({ x: g.event, y: g.points }));
  const rankSeries = (history.current ?? []).map((g) => ({ x: g.event, y: g.overall_rank }));
  const totalPointsSeries = (history.current ?? []).map((g) => ({ x: g.event, y: g.total_points }));

  const captainRows = captains
    .slice()
    .sort((a, b) => b.gw - a.gw)
    .slice(0, 6)
    .map((c) => ({
      gw: c.gw,
      name: elementName.get(c.captainElement) ?? `#${c.captainElement}`,
    }));

  const captainAvailable = profile.captainGws > 0;

  return (
    <>
      <Navbar />
      <main className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-28 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-emerald-200/40 blur-3xl" />
          <div className="absolute -bottom-32 left-[-120px] h-96 w-96 rounded-full bg-emerald-100/50 blur-3xl" />
        </div>

        <div className="mx-auto max-w-7xl px-6 pt-24 pb-20">
          <div className="mb-6">
            <Link
              href="/analyze"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur hover:bg-white"
            >
              <span aria-hidden className="text-lg leading-none">←</span>
              Back
            </Link>
          </div>

          <header className="rounded-3xl border border-slate-200 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.10)]">
            <div className="border-b border-slate-100 px-6 py-6">
              <div className="flex flex-col gap-2">
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                  Entry analysis
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Live profile
                </div>

                <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">{profile.teamName}</h1>

                <p className="text-sm text-slate-600">
                  {profile.managerName} · Entry {profile.entryId}
                </p>
              </div>
            </div>

            <div className="px-6 py-6">
              <section className="grid gap-4 md:grid-cols-4">
                <KpiCard title="Overall points" value={entry.summary_overall_points.toLocaleString()} hint="Season total" />
                <KpiCard title="Overall rank" value={formatRank(entry.summary_overall_rank)} hint="Lower is better" />
                <KpiCard title="Team value" value={`£${profile.teamValueNow.toFixed(1)}`} hint="Current squad value" />
                <KpiCard title="Risk score" value={`${profile.riskScore}`} hint={profile.riskBand} />
              </section>
            </div>
          </header>

          <section className="mt-6">
            <Panel title="Season summary" subtitle="Narrative based on your points and rank trends">
              {seasonSummary.available ? (
                <div className="mt-4 space-y-4">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    <div className="font-semibold text-slate-900">{seasonSummary.headline}</div>
                  </div>

                  <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
                    {seasonSummary.bullets.map((b) => (
                      <li key={b}>{b}</li>
                    ))}
                  </ul>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                      <div className="text-xs font-semibold text-slate-600">Good decisions</div>
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                        {seasonSummary.good.length ? seasonSummary.good.map((g) => <li key={g}>{g}</li>) : <li>Not enough signal yet.</li>}
                      </ul>
                    </div>

                    <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                      <div className="text-xs font-semibold text-slate-600">Bad decisions / leaks</div>
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                        {seasonSummary.bad.length ? seasonSummary.bad.map((b) => <li key={b}>{b}</li>) : <li>No obvious leaks detected.</li>}
                      </ul>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-600">
                  {seasonSummary.headline}
                </div>
              )}
            </Panel>
          </section>

          <section className="mt-6 grid gap-4 lg:grid-cols-3">
            <Panel title="Behavior" subtitle="Transfer and scoring behavior">
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <Metric label="Hits taken (pts)" value={`${profile.totalHitsPoints}`} />
                <Metric label="Avg transfers / GW" value={profile.avgTransfersPerGw.toFixed(2)} />
                <Metric label="Best GW points" value={`${profile.bestGwPoints}`} />
                <Metric label="Worst GW points" value={`${profile.worstGwPoints}`} />
              </dl>
            </Panel>

            <Panel title="Captaincy" subtitle="Stability and recent picks">
              {captainAvailable ? (
                <>
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <Metric label="GWs captured" value={`${profile.captainGws}`} />
                    <Metric label="Distinct captains" value={`${profile.captainDistinct}`} />
                    <Metric label="Captain changes" value={`${profile.captainChanges}`} />
                    <Metric label="Top captain share" value={`${Math.round(profile.captainTopShare * 100)}%`} />
                  </dl>

                  <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <div className="text-xs font-semibold text-slate-600">Recent captains</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {captainRows.map((r) => (
                        <span
                          key={`${r.gw}-${r.name}`}
                          className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700"
                        >
                          GW {r.gw}: {r.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-600">
                  Captaincy data is temporarily unavailable.
                </div>
              )}
            </Panel>

            <Panel title="Chips" subtitle="Timing and usage">
              <div className="mt-4 text-sm text-slate-700">
                {Object.keys(profile.chipTiming).length ? (
                  <ul className="space-y-2">
                    {Object.entries(profile.chipTiming).map(([chip, gw]) => (
                      <li
                        key={chip}
                        className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3"
                      >
                        <span className="font-semibold text-slate-800">{chip}</span>
                        <span className="text-sm font-medium text-slate-600">GW {gw}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4 text-slate-600">
                    No chips used yet.
                  </div>
                )}
              </div>
            </Panel>
          </section>

          <section className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <SparklineCard title="Overall rank" subtitle="Lower is better" series={rankSeries} invertY format="rank" />
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <SparklineCard title="GW points" subtitle="Points scored each gameweek" series={pointsSeries} format="int" />
            </div>
          </section>

          <section className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <SparklineCard title="Total points" subtitle="Cumulative points" series={totalPointsSeries} format="int" />
            </div>

            <Panel title="Risk" subtitle="Heuristic profile summary">
              <div className="mt-3 text-sm text-slate-600">
                Composite heuristic based on hits, transfer volume, points volatility, and captain volatility.
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <Metric label="Risk band" value={profile.riskBand} />
                <Metric label="Captain entropy" value={profile.captainEntropy.toFixed(2)} />
              </dl>

              <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-xs text-slate-600">
                This is behavioral analysis, not a guarantee of future performance.
              </div>
            </Panel>
          </section>
        </div>
      </main>
    </>
  );
}

function KpiCard({ title, value, hint }: { title: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold text-slate-500">{title}</div>
          <div className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">{value}</div>
        </div>
        <div className="rounded-full border border-slate-100 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600">
          {hint}
        </div>
      </div>
    </div>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
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

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
      <dt className="text-[11px] font-semibold text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-slate-900">{value}</dd>
    </div>
  );
}

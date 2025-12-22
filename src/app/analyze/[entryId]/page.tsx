import { fplFetch, fplFetchOrNull } from '../../lib/fpl/client';
import type { FplBootstrapStatic, FplEntry, FplHistory, FplTransfer } from '../../lib/fpl/types';
import { fetchCaptainsForGws } from '../../lib/fpl/picks';
import { buildPredictionProfile } from '../../lib/fpl/profile';
import { SparklineCard } from './Charts';

function formatRank(n: number) {
  if (!Number.isFinite(n) || n <= 0) return '-';
  return Math.round(n).toLocaleString();
}

function formatNumber(n: number) {
  if (!Number.isFinite(n)) return '-';
  return Math.round(n).toLocaleString();
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
      <main className="mx-auto max-w-3xl px-6 pt-28 pb-24">
        <h1 className="text-2xl font-extrabold text-slate-900">Invalid Entry ID</h1>
        <p className="mt-2 text-slate-600">Please enter a numeric FPL Entry ID.</p>
      </main>
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
      <main className="mx-auto max-w-3xl px-6 pt-28 pb-24">
        <h1 className="text-2xl font-extrabold text-slate-900">FPL data is temporarily unavailable</h1>
        <p className="mt-2 text-slate-600">Try again shortly. If it persists, the FPL servers may be under load.</p>
        <div className="mt-6">
          <a
            href={`/analyze/${id}`}
            className="inline-flex items-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Retry
          </a>
        </div>
      </main>
    );
  }

  const gws = (history.current ?? []).map(g => g.event);
  const captains = await fetchCaptainsForGws(id, gws, 6);

  const bootstrap = await fplFetchOrNull<FplBootstrapStatic>(`/bootstrap-static/`, { revalidateSeconds: 3600 });
  const elementName = new Map<number, string>();
  if (bootstrap?.elements?.length) for (const e of bootstrap.elements) elementName.set(e.id, e.web_name);

  const profile = buildPredictionProfile(entry, history, transfers, captains);

  const pointsSeries = (history.current ?? []).map(g => ({ x: g.event, y: g.points }));
  const rankSeries = (history.current ?? []).map(g => ({ x: g.event, y: g.overall_rank }));
  const totalPointsSeries = (history.current ?? []).map(g => ({ x: g.event, y: g.total_points }));

  const captainRows = captains
    .slice()
    .sort((a, b) => b.gw - a.gw)
    .slice(0, 6)
    .map(c => ({
      gw: c.gw,
      name: elementName.get(c.captainElement) ?? `#${c.captainElement}`,
    }));

  const captainAvailable = profile.captainGws > 0;

  return (
    <main className="mx-auto max-w-6xl px-6 pt-28 pb-24">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">{profile.teamName}</h1>
        <p className="text-slate-600">
          {profile.managerName} · Entry {profile.entryId}
        </p>
      </div>

      <section className="mt-10 grid gap-4 md:grid-cols-4">
        <Card title="Overall points" value={entry.summary_overall_points.toLocaleString()} />
        <Card title="Overall rank" value={formatRank(entry.summary_overall_rank)} />
        <Card title="Team value" value={`£${profile.teamValueNow.toFixed(1)}`} />
        <Card title="Risk score" value={`${profile.riskScore} (${profile.riskBand})`} />
      </section>

      <section className="mt-10 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-sm font-semibold text-slate-900">Behavior</div>
          <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <Metric label="Hits taken (pts)" value={`${profile.totalHitsPoints}`} />
            <Metric label="Avg transfers / GW" value={profile.avgTransfersPerGw.toFixed(2)} />
            <Metric label="Best GW points" value={`${profile.bestGwPoints}`} />
            <Metric label="Worst GW points" value={`${profile.worstGwPoints}`} />
          </dl>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-sm font-semibold text-slate-900">Captaincy</div>
          {captainAvailable ? (
            <>
              <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <Metric label="GWs captured" value={`${profile.captainGws}`} />
                <Metric label="Distinct captains" value={`${profile.captainDistinct}`} />
                <Metric label="Captain changes" value={`${profile.captainChanges}`} />
                <Metric label="Top captain share" value={`${Math.round(profile.captainTopShare * 100)}%`} />
              </dl>
              <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3">
                <div className="text-xs font-semibold text-slate-500">Recent captains</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {captainRows.map(r => (
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
            <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Captaincy data is temporarily unavailable.
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-sm font-semibold text-slate-900">Chips</div>
          <div className="mt-4 text-sm text-slate-700">
            {Object.keys(profile.chipTiming).length ? (
              <ul className="space-y-2">
                {Object.entries(profile.chipTiming).map(([chip, gw]) => (
                  <li key={chip} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2">
                    <span className="font-medium text-slate-800">{chip}</span>
                    <span className="text-slate-600">GW {gw}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-xl bg-slate-50 px-4 py-3 text-slate-600">No chips used yet.</div>
            )}
          </div>
        </div>
      </section>

      <section className="mt-10 grid gap-4 md:grid-cols-2">
        <SparklineCard title="Overall rank" subtitle="Lower is better" series={rankSeries} invertY formatY={formatRank} />
        <SparklineCard title="GW points" subtitle="Points scored each gameweek" series={pointsSeries} formatY={formatNumber} />
      </section>

      <section className="mt-4 grid gap-4 md:grid-cols-2">
        <SparklineCard title="Total points" subtitle="Cumulative points" series={totalPointsSeries} formatY={formatNumber} />
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-sm font-semibold text-slate-900">Risk</div>
          <div className="mt-3 text-sm text-slate-600">
            Composite heuristic based on hits, transfer volume, points volatility, and captain volatility.
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <Metric label="Risk band" value={profile.riskBand} />
            <Metric label="Captain entropy" value={profile.captainEntropy.toFixed(2)} />
          </div>
          <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-600">
            This is behavioral analysis, not a guarantee of future performance.
          </div>
        </div>
      </section>
    </main>
  );
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-xs font-semibold text-slate-500">{title}</div>
      <div className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">{value}</div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-4 py-3">
      <dt className="text-xs font-semibold text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-slate-900">{value}</dd>
    </div>
  );
}

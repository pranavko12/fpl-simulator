import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type ElementType = 'GK' | 'DEF' | 'MID' | 'FWD';

type BootstrapEvent = {
  id: number;
  finished: boolean;
  is_current: boolean;
  is_next: boolean;
};

type BootstrapTeam = { id: number; name: string; short_name: string };

type BootstrapElement = {
  id: number;
  code: number;
  web_name: string;
  element_type: number;
  team: number;
  now_cost: number;
  total_points: number;
  minutes: number;
};

type BootstrapStatic = {
  events: BootstrapEvent[];
  teams: BootstrapTeam[];
  elements: BootstrapElement[];
};

type Fixture = {
  id: number;
  event: number | null;
  team_h: number;
  team_a: number;
  team_h_difficulty: number;
  team_a_difficulty: number;
  kickoff_time: string | null;
};

type EntryResponse = { name?: string; player_first_name?: string; player_last_name?: string };

type PicksResponse = {
  picks: Array<{
    element: number;
    position: number;
    is_captain: boolean;
    is_vice_captain: boolean;
  }>;
};

type ElementHistoryRow = {
  round: number;
  total_points: number;
  minutes: number;
  value?: number;
};

type ElementSummary = {
  history: ElementHistoryRow[];
};

type PrefillPlayer = {
  slot: number;
  isBench: boolean;
  id: string;
  name: string;
  element_type: ElementType | null;
  team: string;
  price: number | null;
  points: number | null;
};

type ApiPlayersResp = {
  players: Array<{
    id: string;
    code: number | null;
    name: string;
    element_type: ElementType | null;
    price: number | null;
    team: string;
    points: number | null;
  }>;
};

type ApiEntryTeamResp = {
  entryId: number;
  gw: number;
  teamName: string | null;
  managerName: string | null;
  squad: PrefillPlayer[];
};

type ApiStatsResp = {
  from: number;
  to: number;
  lastFinishedGw: number;
  stats: Record<
    string,
    {
      from: { gw: number; points: number; price: number; found: boolean; priceFound: boolean };
      to: { gw: number; points: number; price: number; found: boolean; priceFound: boolean };
    }
  >;
  missing: Array<{ id: string; reason: string }>;
};

type BetterCandidate = {
  id: string;
  code: number | null;
  name: string;
  team: string;
  pos: ElementType;
  priceFrom: number;
  priceTo: number;
  priceDelta: number;
  pointsFrom: number;
  pointsTo: number;
  pointsDelta: number;
};

type BetterOptionsResp = {
  player: BetterCandidate;
  priceBand: { min: number; max: number };
  topByPriceIncrease: BetterCandidate[];
  topByPointsGained: BetterCandidate[];
  recommended: BetterCandidate | null;
  currentIsBestByPoints: boolean;
};

type ForecastCandidate = {
  id: string;
  code: number | null;
  name: string;
  team: string;
  pos: ElementType;
  price: number;
  epNextGw: number;
  epNext5: number;
};

type ForecastOptionsResp = {
  nextGw: number;
  player: ForecastCandidate;
  priceBand: { min: number; max: number };
  topNextGw: ForecastCandidate[];
  topNext5: ForecastCandidate[];
  recommendedNextGw: ForecastCandidate | null;
  recommendedNext5: ForecastCandidate | null;
  currentIsBestNextGw: boolean;
  currentIsBestNext5: boolean;
};

function normalizeElementType(n: number): ElementType | null {
  if (n === 1) return 'GK';
  if (n === 2) return 'DEF';
  if (n === 3) return 'MID';
  if (n === 4) return 'FWD';
  return null;
}

function lastFinishedGw(events: BootstrapEvent[]): number {
  let last = 0;
  for (const e of events) {
    if (e.finished && Number.isFinite(e.id)) last = Math.max(last, e.id);
  }
  return last;
}

function nextGwFromEvents(events: BootstrapEvent[]): number {
  const nx = (events ?? []).find((e) => e.is_next && Number.isFinite(e.id));
  if (nx && Number.isFinite(nx.id)) return nx.id;
  const last = lastFinishedGw(events ?? []);
  return Math.min(38, Math.max(1, last + 1));
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    cache: 'no-store',
    headers: {
      'user-agent': 'fpl-simulator/1.0',
      accept: 'application/json',
    },
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} for ${url}${txt ? `: ${txt}` : ''}`);
  }
  return (await res.json()) as T;
}

function parseIds(raw: string): string[] {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => /^\d+$/.test(s));
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  let i = 0;

  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return out;
}

function priceAtOrBefore(hist: ElementHistoryRow[], gw: number): { price: number; found: boolean } {
  let bestRound = -1;
  let bestValue: number | null = null;

  for (const h of hist) {
    if (h.round <= gw && typeof h.value === 'number' && Number.isFinite(h.value)) {
      if (h.round > bestRound) {
        bestRound = h.round;
        bestValue = h.value;
      }
    }
  }

  if (bestValue == null) return { price: 0, found: false };
  return { price: bestValue / 10, found: true };
}

function cumulativePointsUpTo(hist: ElementHistoryRow[], gw: number): { points: number; found: boolean } {
  let sum = 0;
  let any = false;
  for (const h of hist) {
    if (h.round <= gw) {
      sum += Number(h.total_points) || 0;
      any = true;
    }
  }
  return { points: sum, found: any };
}

function parseGwParam(raw: string | null): number | null {
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function validateGwRange(from: number, to: number): string | null {
  if (from < 1 || to < 1 || from > 38 || to > 38) return 'GW out of range';
  if (from > to) return 'from must be <= to';
  return null;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function fixtureMultiplier(difficulty: number): number {
  const d = Number(difficulty);
  const mult = 1.25 - 0.08 * (d - 3);
  return clamp(mult, 0.9, 1.5);
}

function fixturesForTeamInGw(fixtures: Fixture[], teamId: number, gw: number): number[] {
  const diffs: number[] = [];
  for (const f of fixtures) {
    if (f.event !== gw) continue;
    if (f.team_h === teamId) diffs.push(Number(f.team_h_difficulty) || 3);
    else if (f.team_a === teamId) diffs.push(Number(f.team_a_difficulty) || 3);
  }
  return diffs;
}

function lastNGwRowsBefore(hist: ElementHistoryRow[], beforeGw: number, n: number): ElementHistoryRow[] {
  const rows = (hist ?? [])
    .filter((r) => Number.isFinite(r.round) && r.round < beforeGw)
    .sort((a, b) => b.round - a.round)
    .slice(0, n);
  return rows;
}

function pp90FromRecentOrSeason(recent: ElementHistoryRow[], seasonPoints: number, seasonMinutes: number): number {
  const mins = recent.reduce((s, r) => s + (Number(r.minutes) || 0), 0);
  const pts = recent.reduce((s, r) => s + (Number(r.total_points) || 0), 0);
  if (mins >= 180) return (pts / mins) * 90;
  if (seasonMinutes > 0) return (seasonPoints / seasonMinutes) * 90;
  return 0;
}

function expMinutesFromRecent(recent: ElementHistoryRow[], fallback: number): number {
  if (!recent.length) return clamp(fallback, 0, 90);
  const mins = recent.reduce((s, r) => s + (Number(r.minutes) || 0), 0);
  const avg = mins / recent.length;
  return clamp(avg, 0, 90);
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const op = q.get('op');

  if (op === 'players') {
    const boot = await fetchJson<BootstrapStatic>('https://fantasy.premierleague.com/api/bootstrap-static/');

    const teamName = new Map<number, string>();
    for (const t of boot.teams ?? []) teamName.set(t.id, t.name);

    const players = (boot.elements ?? []).map((e) => ({
      id: String(e.id),
      code: Number.isFinite(e.code) ? e.code : null,
      name: e.web_name,
      element_type: normalizeElementType(e.element_type),
      price: Number.isFinite(e.now_cost) ? e.now_cost / 10 : null,
      team: teamName.get(e.team) ?? '',
      points: Number.isFinite(e.total_points) ? e.total_points : null,
    }));

    const resp: ApiPlayersResp = { players };
    return NextResponse.json(resp);
  }

  if (op === 'entry_team') {
    const entryIdRaw = q.get('entryId') ?? '';
    const gwRaw = q.get('gw') ?? '';

    const entryId = Number(entryIdRaw);
    const gw = Number(gwRaw);

    if (!Number.isFinite(entryId) || entryId <= 0) {
      return NextResponse.json({ error: 'entryId required' }, { status: 400 });
    }
    if (!Number.isFinite(gw) || gw <= 0) {
      return NextResponse.json({ error: 'gw required' }, { status: 400 });
    }

    const boot = await fetchJson<BootstrapStatic>('https://fantasy.premierleague.com/api/bootstrap-static/');
    const lastGw = lastFinishedGw(boot.events ?? []);
    if (lastGw > 0 && gw > lastGw) {
      return NextResponse.json({ error: `GW (${gw}) is beyond last finished GW (${lastGw}).` }, { status: 400 });
    }

    const teamName = new Map<number, string>();
    for (const t of boot.teams ?? []) teamName.set(t.id, t.name);

    const elementById = new Map<number, BootstrapElement>();
    for (const e of boot.elements ?? []) elementById.set(e.id, e);

    const [entry, picks] = await Promise.all([
      fetchJson<EntryResponse>(`https://fantasy.premierleague.com/api/entry/${entryId}/`),
      fetchJson<PicksResponse>(`https://fantasy.premierleague.com/api/entry/${entryId}/event/${gw}/picks/`),
    ]);

    const teamNameStr = typeof entry.name === 'string' ? entry.name : null;
    const managerNameStr =
      [entry.player_first_name, entry.player_last_name]
        .filter((x) => typeof x === 'string' && x.trim())
        .join(' ')
        .trim() || null;

    const squad: PrefillPlayer[] = (picks.picks ?? [])
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((p) => {
        const el = elementById.get(p.element);
        const pos = el ? normalizeElementType(el.element_type) : null;
        const price = el && Number.isFinite(el.now_cost) ? el.now_cost / 10 : null;
        const totalPoints = el && Number.isFinite(el.total_points) ? el.total_points : null;

        return {
          slot: p.position,
          isBench: p.position >= 12,
          id: String(p.element),
          name: el?.web_name ?? `#${p.element}`,
          element_type: pos,
          team: el ? teamName.get(el.team) ?? '' : '',
          price,
          points: totalPoints,
        };
      });

    const resp: ApiEntryTeamResp = {
      entryId,
      gw,
      teamName: teamNameStr,
      managerName: managerNameStr,
      squad,
    };

    return NextResponse.json(resp);
  }

  if (op === 'stats') {
    const idsRaw = q.get('ids') ?? '';
    const fromRaw = q.get('from') ?? '';
    const toRaw = q.get('to') ?? '';

    const from = Number(fromRaw);
    const to = Number(toRaw);

    if (!idsRaw) return NextResponse.json({ error: 'ids required' }, { status: 400 });
    if (!Number.isFinite(from) || !Number.isFinite(to)) {
      return NextResponse.json({ error: 'from and to are required numbers' }, { status: 400 });
    }
    const gwErr = validateGwRange(from, to);
    if (gwErr) return NextResponse.json({ error: gwErr }, { status: 400 });

    const ids = parseIds(idsRaw);
    if (!ids.length) return NextResponse.json({ error: 'no valid ids' }, { status: 400 });

    const boot = await fetchJson<BootstrapStatic>('https://fantasy.premierleague.com/api/bootstrap-static/');
    const lastGw = lastFinishedGw(boot.events ?? []);
    const maxGw = Math.max(from, to);

    if (lastGw > 0 && maxGw > lastGw) {
      return NextResponse.json(
        { error: `Simulation to-GW (${maxGw}) is beyond last finished GW (${lastGw}).` },
        { status: 400 }
      );
    }

    const missing: Array<{ id: string; reason: string }> = [];

    const results = await mapLimit(ids, 10, async (id) => {
      try {
        const data = await fetchJson<ElementSummary>(`https://fantasy.premierleague.com/api/element-summary/${id}/`);
        return { id, ok: true as const, data };
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'element-summary failed';
        return { id, ok: false as const, reason: msg };
      }
    });

    const stats: ApiStatsResp['stats'] = {};

    for (const r of results) {
      if (!r.ok) {
        missing.push({ id: r.id, reason: r.reason });
        stats[r.id] = {
          from: { gw: from, points: 0, price: 0, found: false, priceFound: false },
          to: { gw: to, points: 0, price: 0, found: false, priceFound: false },
        };
        continue;
      }

      const hist = Array.isArray(r.data.history) ? r.data.history : [];

      const fromPts = cumulativePointsUpTo(hist, from);
      const toPts = cumulativePointsUpTo(hist, to);

      const fromPrice = priceAtOrBefore(hist, from);
      const toPrice = priceAtOrBefore(hist, to);

      stats[r.id] = {
        from: {
          gw: from,
          points: fromPts.points,
          price: fromPrice.price,
          found: fromPts.found,
          priceFound: fromPrice.found,
        },
        to: {
          gw: to,
          points: toPts.points,
          price: toPrice.price,
          found: toPts.found,
          priceFound: toPrice.found,
        },
      };
    }

    const resp: ApiStatsResp = { from, to, lastFinishedGw: lastGw, stats, missing };
    return NextResponse.json(resp);
  }

  if (op === 'better_options') {
    const playerIdRaw = (q.get('playerId') ?? '').trim();
    const fromN = parseGwParam(q.get('from'));
    const toN = parseGwParam(q.get('to'));

    if (!/^\d+$/.test(playerIdRaw)) {
      return NextResponse.json({ error: 'playerId required' }, { status: 400 });
    }
    if (fromN == null || toN == null) {
      return NextResponse.json({ error: 'from and to are required numbers' }, { status: 400 });
    }

    const from = fromN;
    const to = toN;

    const gwErr = validateGwRange(from, to);
    if (gwErr) return NextResponse.json({ error: gwErr }, { status: 400 });

    const boot = await fetchJson<BootstrapStatic>('https://fantasy.premierleague.com/api/bootstrap-static/');
    const lastGw = lastFinishedGw(boot.events ?? []);
    if (lastGw > 0 && to > lastGw) {
      return NextResponse.json(
        { error: `Simulation to-GW (${to}) is beyond last finished GW (${lastGw}).` },
        { status: 400 }
      );
    }

    const teamName = new Map<number, string>();
    for (const t of boot.teams ?? []) teamName.set(t.id, t.name);

    const elementById = new Map<number, BootstrapElement>();
    for (const e of boot.elements ?? []) elementById.set(e.id, e);

    const baseEl = elementById.get(Number(playerIdRaw));
    if (!baseEl) return NextResponse.json({ error: 'Unknown playerId' }, { status: 400 });

    const basePosMaybe = normalizeElementType(baseEl.element_type);
    if (!basePosMaybe) return NextResponse.json({ error: 'Unsupported player position' }, { status: 400 });
    const basePos: ElementType = basePosMaybe;

    const baseSummary = await fetchJson<ElementSummary>(
      `https://fantasy.premierleague.com/api/element-summary/${baseEl.id}/`
    );
    const baseHist = Array.isArray(baseSummary.history) ? baseSummary.history : [];

    const baseFromPts = cumulativePointsUpTo(baseHist, from);
    const baseToPts = cumulativePointsUpTo(baseHist, to);
    const baseFromPrice = priceAtOrBefore(baseHist, from);
    const baseToPrice = priceAtOrBefore(baseHist, to);

    if (!baseFromPrice.found) {
      return NextResponse.json(
        { error: 'Base player missing historical price at FROM GW (cannot apply ±1.0m band).' },
        { status: 400 }
      );
    }

    const baseCandidate: BetterCandidate = {
      id: String(baseEl.id),
      code: Number.isFinite(baseEl.code) ? baseEl.code : null,
      name: baseEl.web_name,
      team: teamName.get(baseEl.team) ?? '',
      pos: basePos,
      priceFrom: baseFromPrice.price,
      priceTo: baseToPrice.price,
      priceDelta: baseToPrice.price - baseFromPrice.price,
      pointsFrom: baseFromPts.points,
      pointsTo: baseToPts.points,
      pointsDelta: baseToPts.points - baseFromPts.points,
    };

    const minPrice = Math.max(0, baseCandidate.priceFrom - 1.0);
    const maxPrice = baseCandidate.priceFrom + 1.0;

    const posElements = (boot.elements ?? []).filter((e) => normalizeElementType(e.element_type) === basePos);

    const candidates = await mapLimit(posElements, 10, async (el): Promise<BetterCandidate | null> => {
      try {
        const s = await fetchJson<ElementSummary>(
          `https://fantasy.premierleague.com/api/element-summary/${el.id}/`
        );
        const hist = Array.isArray(s.history) ? s.history : [];

        const pFrom = priceAtOrBefore(hist, from);
        if (!pFrom.found) return null;

        const priceFrom = pFrom.price;
        if (priceFrom < minPrice || priceFrom > maxPrice) return null;

        const pTo = priceAtOrBefore(hist, to);
        const ptsFrom = cumulativePointsUpTo(hist, from);
        const ptsTo = cumulativePointsUpTo(hist, to);

        const priceTo = pTo.found ? pTo.price : priceFrom;

        return {
          id: String(el.id),
          code: Number.isFinite(el.code) ? el.code : null,
          name: el.web_name,
          team: teamName.get(el.team) ?? '',
          pos: basePos,
          priceFrom,
          priceTo,
          priceDelta: priceTo - priceFrom,
          pointsFrom: ptsFrom.points,
          pointsTo: ptsTo.points,
          pointsDelta: ptsTo.points - ptsFrom.points,
        };
      } catch {
        return null;
      }
    });

    const uniq = new Map<string, BetterCandidate>();
    for (const c of candidates) {
      if (c) uniq.set(c.id, c);
    }
    uniq.set(baseCandidate.id, baseCandidate);

    const list = Array.from(uniq.values());

    const topByPriceIncrease = list
      .slice()
      .sort((a, b) => b.priceDelta - a.priceDelta || b.pointsDelta - a.pointsDelta)
      .slice(0, 8);

    const topByPointsGained = list
      .slice()
      .sort((a, b) => b.pointsDelta - a.pointsDelta || b.priceDelta - a.priceDelta)
      .slice(0, 8);

    const recommended = topByPointsGained.length ? topByPointsGained[0] : null;
    const currentIsBestByPoints = !!recommended && recommended.id === baseCandidate.id;

    const out: BetterOptionsResp = {
      player: baseCandidate,
      priceBand: { min: minPrice, max: maxPrice },
      topByPriceIncrease,
      topByPointsGained,
      recommended,
      currentIsBestByPoints,
    };

    return NextResponse.json(out);
  }

  if (op === 'forecast_options') {
    const playerIdRaw = (q.get('playerId') ?? '').trim();
    if (!/^\d+$/.test(playerIdRaw)) {
      return NextResponse.json({ error: 'playerId required' }, { status: 400 });
    }

    const boot = await fetchJson<BootstrapStatic>('https://fantasy.premierleague.com/api/bootstrap-static/');
    const fixtures = await fetchJson<Fixture[]>('https://fantasy.premierleague.com/api/fixtures/');

    const nextGw = nextGwFromEvents(boot.events ?? []);
    if (nextGw < 1 || nextGw > 38) return NextResponse.json({ error: 'nextGw invalid' }, { status: 500 });

    const teamName = new Map<number, string>();
    for (const t of boot.teams ?? []) teamName.set(t.id, t.name);

    const elementById = new Map<number, BootstrapElement>();
    for (const e of boot.elements ?? []) elementById.set(e.id, e);

    const baseEl = elementById.get(Number(playerIdRaw));
    if (!baseEl) return NextResponse.json({ error: 'Unknown playerId' }, { status: 400 });

    const basePosMaybe = normalizeElementType(baseEl.element_type);
    if (!basePosMaybe) return NextResponse.json({ error: 'Unsupported player position' }, { status: 400 });
    const basePos: ElementType = basePosMaybe;

    const basePrice = Number.isFinite(baseEl.now_cost) ? baseEl.now_cost / 10 : 0;
    const minPrice = Math.max(0, basePrice - 1.0);
    const maxPrice = basePrice + 1.0;

    const posElements = (boot.elements ?? []).filter((e) => normalizeElementType(e.element_type) === basePos);

    const summaries = await mapLimit(posElements, 10, async (el) => {
      try {
        const s = await fetchJson<ElementSummary>(
          `https://fantasy.premierleague.com/api/element-summary/${el.id}/`
        );
        return { el, ok: true as const, summary: s };
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'element-summary failed';
        return { el, ok: false as const, reason: msg };
      }
    });

    const computed: ForecastCandidate[] = [];

    for (const r of summaries) {
      if (!r.ok) continue;

      const el = r.el;
      const price = Number.isFinite(el.now_cost) ? el.now_cost / 10 : 0;
      if (price < minPrice || price > maxPrice) continue;

      const hist = Array.isArray(r.summary.history) ? r.summary.history : [];
      const recent = lastNGwRowsBefore(hist, nextGw, 5);

      const pp90 = pp90FromRecentOrSeason(recent, Number(el.total_points) || 0, Number(el.minutes) || 0);
      const expMin = expMinutesFromRecent(recent, 80);

      let epNext = 0;
      const diffsNext = fixturesForTeamInGw(fixtures, el.team, nextGw);
      for (const d of diffsNext) epNext += pp90 * (expMin / 90) * fixtureMultiplier(d);

      let ep5 = 0;
      for (let gw = nextGw; gw <= Math.min(38, nextGw + 4); gw++) {
        const diffs = fixturesForTeamInGw(fixtures, el.team, gw);
        for (const d of diffs) ep5 += pp90 * (expMin / 90) * fixtureMultiplier(d);
      }

      computed.push({
        id: String(el.id),
        code: Number.isFinite(el.code) ? el.code : null,
        name: el.web_name,
        team: teamName.get(el.team) ?? '',
        pos: basePos,
        price,
        epNextGw: Number.isFinite(epNext) ? epNext : 0,
        epNext5: Number.isFinite(ep5) ? ep5 : 0,
      });
    }

    if (!computed.some((c) => c.id === String(baseEl.id))) {
      const baseSummary = await fetchJson<ElementSummary>(
        `https://fantasy.premierleague.com/api/element-summary/${baseEl.id}/`
      );
      const hist = Array.isArray(baseSummary.history) ? baseSummary.history : [];
      const recent = lastNGwRowsBefore(hist, nextGw, 5);

      const pp90 = pp90FromRecentOrSeason(recent, Number(baseEl.total_points) || 0, Number(baseEl.minutes) || 0);
      const expMin = expMinutesFromRecent(recent, 80);

      let epNext = 0;
      const diffsNext = fixturesForTeamInGw(fixtures, baseEl.team, nextGw);
      for (const d of diffsNext) epNext += pp90 * (expMin / 90) * fixtureMultiplier(d);

      let ep5 = 0;
      for (let gw = nextGw; gw <= Math.min(38, nextGw + 4); gw++) {
        const diffs = fixturesForTeamInGw(fixtures, baseEl.team, gw);
        for (const d of diffs) ep5 += pp90 * (expMin / 90) * fixtureMultiplier(d);
      }

      computed.push({
        id: String(baseEl.id),
        code: Number.isFinite(baseEl.code) ? baseEl.code : null,
        name: baseEl.web_name,
        team: teamName.get(baseEl.team) ?? '',
        pos: basePos,
        price: basePrice,
        epNextGw: Number.isFinite(epNext) ? epNext : 0,
        epNext5: Number.isFinite(ep5) ? ep5 : 0,
      });
    }

    const uniq = new Map<string, ForecastCandidate>();
    for (const c of computed) uniq.set(c.id, c);
    const base = uniq.get(String(baseEl.id))!;

    const list = Array.from(uniq.values());

    const topNextGw = list
      .slice()
      .sort((a, b) => b.epNextGw - a.epNextGw || b.epNext5 - a.epNext5)
      .slice(0, 8);

    const topNext5 = list
      .slice()
      .sort((a, b) => b.epNext5 - a.epNext5 || b.epNextGw - a.epNextGw)
      .slice(0, 8);

    const recommendedNextGw = topNextGw.length ? topNextGw[0] : null;
    const recommendedNext5 = topNext5.length ? topNext5[0] : null;

    const out: ForecastOptionsResp = {
      nextGw,
      player: base,
      priceBand: { min: minPrice, max: maxPrice },
      topNextGw,
      topNext5,
      recommendedNextGw,
      recommendedNext5,
      currentIsBestNextGw: !!recommendedNextGw && recommendedNextGw.id === base.id,
      currentIsBestNext5: !!recommendedNext5 && recommendedNext5.id === base.id,
    };

    return NextResponse.json(out);
  }

  return NextResponse.json({ error: 'unknown op' }, { status: 400 });
}

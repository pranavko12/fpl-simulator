import type { BootstrapEvent, ElementHistoryRow, ElementType, Fixture } from './types';

export function normalizeElementType(n: number): ElementType | null {
  if (n === 1) return 'GK';
  if (n === 2) return 'DEF';
  if (n === 3) return 'MID';
  if (n === 4) return 'FWD';
  return null;
}

export function lastFinishedGw(events: BootstrapEvent[]): number {
  let last = 0;
  for (const e of events) {
    if (e.finished && Number.isFinite(e.id)) last = Math.max(last, e.id);
  }
  return last;
}

export function nextGwFromEvents(events: BootstrapEvent[]): number {
  const nx = (events ?? []).find((e) => e.is_next && Number.isFinite(e.id));
  if (nx && Number.isFinite(nx.id)) return nx.id;
  const last = lastFinishedGw(events ?? []);
  return Math.min(38, Math.max(1, last + 1));
}

export function parseIds(raw: string): string[] {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => /^\d+$/.test(s));
}

export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
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

export function priceAtOrBefore(hist: ElementHistoryRow[], gw: number): { price: number; found: boolean } {
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

export function cumulativePointsUpTo(hist: ElementHistoryRow[], gw: number): { points: number; found: boolean } {
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

export function parseGwParam(raw: string | null): number | null {
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function validateGwRange(from: number, to: number): string | null {
  if (from < 1 || to < 1 || from > 38 || to > 38) return 'GW out of range';
  if (from > to) return 'from must be <= to';
  return null;
}

export function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

export function fixtureMultiplier(difficulty: number): number {
  const d = Number(difficulty);
  const mult = 1.25 - 0.08 * (d - 3);
  return clamp(mult, 0.9, 1.5);
}

export function fixturesForTeamInGw(fixtures: Fixture[], teamId: number, gw: number): number[] {
  const diffs: number[] = [];
  for (const f of fixtures) {
    if (f.event !== gw) continue;
    if (f.team_h === teamId) diffs.push(Number(f.team_h_difficulty) || 3);
    else if (f.team_a === teamId) diffs.push(Number(f.team_a_difficulty) || 3);
  }
  return diffs;
}

export function lastNGwRowsBefore(hist: ElementHistoryRow[], beforeGw: number, n: number): ElementHistoryRow[] {
  return (hist ?? [])
    .filter((r) => Number.isFinite(r.round) && r.round < beforeGw)
    .sort((a, b) => b.round - a.round)
    .slice(0, n);
}

export function pp90FromRecentOrSeason(
  recent: ElementHistoryRow[],
  seasonPoints: number,
  seasonMinutes: number
): number {
  const mins = recent.reduce((s, r) => s + (Number(r.minutes) || 0), 0);
  const pts = recent.reduce((s, r) => s + (Number(r.total_points) || 0), 0);
  if (mins >= 180) return (pts / mins) * 90;
  if (seasonMinutes > 0) return (seasonPoints / seasonMinutes) * 90;
  return 0;
}

export function expMinutesFromRecent(recent: ElementHistoryRow[], fallback: number): number {
  if (!recent.length) return clamp(fallback, 0, 90);
  const mins = recent.reduce((s, r) => s + (Number(r.minutes) || 0), 0);
  const avg = mins / recent.length;
  return clamp(avg, 0, 90);
}

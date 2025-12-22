import type { FplEntry, FplHistory, FplTransfer } from './types';
import type { GwCaptain } from './picks';

export type PredictionProfile = {
  entryId: number;
  managerName: string;
  teamName: string;
  startedGw: number;
  currentOverallRank: number;
  currentOverallPoints: number;
  totalHitsPoints: number;
  avgTransfersPerGw: number;
  chipTiming: Record<string, number>;
  teamValueNow: number;
  bankNow: number;
  avgPointsPerGw: number;
  bestGwPoints: number;
  worstGwPoints: number;

  captainGws: number;
  captainDistinct: number;
  captainChanges: number;
  captainTopShare: number;
  captainEntropy: number;

  riskScore: number;
  riskBand: 'Low' | 'Medium' | 'High';
};

function mean(nums: number[]) {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function stddev(nums: number[]) {
  if (nums.length < 2) return 0;
  const m = mean(nums);
  const v = mean(nums.map(x => (x - m) ** 2));
  return Math.sqrt(v);
}

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

function entropy(counts: number[]) {
  const total = counts.reduce((a, b) => a + b, 0);
  if (total <= 0) return 0;
  let h = 0;
  for (const c of counts) {
    if (c <= 0) continue;
    const p = c / total;
    h += -p * Math.log2(p);
  }
  return h;
}

export function buildPredictionProfile(
  entry: FplEntry,
  history: FplHistory,
  transfers: FplTransfer[],
  captains: GwCaptain[] = []
): PredictionProfile {
  const gws = history.current ?? [];
  const points = gws.map(g => g.points);
  const transferCounts = gws.map(g => g.event_transfers);
  const hitCosts = gws.map(g => g.event_transfers_cost);

  const chipTiming: Record<string, number> = {};
  for (const c of history.chips ?? []) chipTiming[c.name] = c.event;

  const capElements = captains.slice().sort((a, b) => a.gw - b.gw).map(c => c.captainElement);

  const capCounts = new Map<number, number>();
  for (const e of capElements) capCounts.set(e, (capCounts.get(e) ?? 0) + 1);

  const capDistinct = capCounts.size;
  const capGws = capElements.length;

  let capChanges = 0;
  for (let i = 1; i < capElements.length; i++) if (capElements[i] !== capElements[i - 1]) capChanges++;

  const sortedCounts = Array.from(capCounts.values()).sort((a, b) => b - a);
  const topShare = capGws ? (sortedCounts[0] ?? 0) / capGws : 0;
  const capEntropy = entropy(sortedCounts);

  const hitsTotal = hitCosts.reduce((a, b) => a + b, 0);
  const transfersAvg = mean(transferCounts);
  const pointsVol = stddev(points);

  const capChangeRate = capGws > 1 ? capChanges / (capGws - 1) : 0;
  const capDiversityRate = capGws ? capDistinct / capGws : 0;

  const hitsScore = clamp01(hitsTotal / 32);
  const transferScore = clamp01(transfersAvg / 2.2);
  const volatilityScore = clamp01(pointsVol / 20);
  const captainVolScore = clamp01(0.6 * capChangeRate + 0.4 * capDiversityRate);

  const riskScore01 = 0.35 * hitsScore + 0.25 * transferScore + 0.25 * volatilityScore + 0.15 * captainVolScore;
  const riskScore = Math.round(riskScore01 * 100);

  const riskBand: 'Low' | 'Medium' | 'High' = riskScore < 34 ? 'Low' : riskScore < 67 ? 'Medium' : 'High';

  return {
    entryId: entry.id,
    managerName: `${entry.player_first_name} ${entry.player_last_name}`.trim(),
    teamName: entry.name,
    startedGw: entry.started_event,
    currentOverallRank: entry.summary_overall_rank,
    currentOverallPoints: entry.summary_overall_points,
    totalHitsPoints: hitsTotal,
    avgTransfersPerGw: transfersAvg,
    chipTiming,
    teamValueNow: entry.last_deadline_value / 10,
    bankNow: entry.last_deadline_bank / 10,
    avgPointsPerGw: mean(points),
    bestGwPoints: points.length ? Math.max(...points) : 0,
    worstGwPoints: points.length ? Math.min(...points) : 0,

    captainGws: capGws,
    captainDistinct: capDistinct,
    captainChanges: capChanges,
    captainTopShare: topShare,
    captainEntropy: capEntropy,

    riskScore,
    riskBand,
  };
}

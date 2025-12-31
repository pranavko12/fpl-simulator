import { getBootstrap } from '../bootstrap';
import { getElementSummary } from '../elementSummary';
import {
  cumulativePointsUpTo,
  lastFinishedGw,
  mapLimit,
  normalizeElementType,
  priceAtOrBefore,
  validateGwRange,
} from '../utils';
import type { BetterCandidate, BetterOptionsResp, BootstrapElement } from '../types';

export async function opBetterOptions(playerIdRaw: string, from: number, to: number): Promise<BetterOptionsResp> {
  const gwErr = validateGwRange(from, to);
  if (gwErr) throw new Error(gwErr);

  const boot = await getBootstrap();
  const lastGw = lastFinishedGw(boot.events ?? []);
  if (lastGw > 0 && to > lastGw) {
    throw new Error(`Simulation to-GW (${to}) is beyond last finished GW (${lastGw}).`);
  }

  const teamName = new Map<number, string>();
  for (const t of boot.teams ?? []) teamName.set(t.id, t.name);

  const elementById = new Map<number, BootstrapElement>();
  for (const e of boot.elements ?? []) elementById.set(e.id, e);

  const baseEl = elementById.get(Number(playerIdRaw));
  if (!baseEl) throw new Error('Unknown playerId');

  const basePosMaybe = normalizeElementType(baseEl.element_type);
  if (!basePosMaybe) throw new Error('Unsupported player position');
  const basePos = basePosMaybe;

  const baseSummary = await getElementSummary(baseEl.id);
  const baseHist = Array.isArray(baseSummary.history) ? baseSummary.history : [];

  const baseFromPts = cumulativePointsUpTo(baseHist, from);
  const baseToPts = cumulativePointsUpTo(baseHist, to);
  const baseFromPrice = priceAtOrBefore(baseHist, from);
  const baseToPrice = priceAtOrBefore(baseHist, to);

  if (!baseFromPrice.found) {
    throw new Error('Base player missing historical price at FROM GW (cannot apply ±1.0m band).');
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
      const s = await getElementSummary(el.id);
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

  return {
    player: baseCandidate,
    priceBand: { min: minPrice, max: maxPrice },
    topByPriceIncrease,
    topByPointsGained,
    recommended,
    currentIsBestByPoints,
  };
}

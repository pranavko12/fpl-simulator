import { getBootstrap } from '../bootstrap';
import { getElementSummary } from '../elementSummary';
import { mapLimit, parseIds, validateGwRange, lastFinishedGw, cumulativePointsUpTo, priceAtOrBefore } from '../utils';
import type { ApiStatsResp, ElementSummary } from '../types';

export async function opStats(idsRaw: string, from: number, to: number): Promise<ApiStatsResp> {
  const gwErr = validateGwRange(from, to);
  if (gwErr) throw new Error(gwErr);

  const ids = parseIds(idsRaw);
  if (!ids.length) throw new Error('no valid ids');

  const boot = await getBootstrap();
  const lastGw = lastFinishedGw(boot.events ?? []);
  const maxGw = Math.max(from, to);

  if (lastGw > 0 && maxGw > lastGw) {
    throw new Error(`Simulation to-GW (${maxGw}) is beyond last finished GW (${lastGw}).`);
  }

  const missing: Array<{ id: string; reason: string }> = [];

  const results = await mapLimit(ids, 10, async (id) => {
    try {
      const data = await getElementSummary(id);
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

    const hist = Array.isArray((r.data as ElementSummary).history) ? r.data.history : [];

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

  return { from, to, lastFinishedGw: lastGw, stats, missing };
}

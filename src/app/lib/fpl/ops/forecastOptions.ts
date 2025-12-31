import { getBootstrap } from '../bootstrap';
import { getFixtures } from '../fixtures';
import { getElementSummary } from '../elementSummary';
import {
  expMinutesFromRecent,
  fixtureMultiplier,
  fixturesForTeamInGw,
  lastNGwRowsBefore,
  mapLimit,
  nextGwFromEvents,
  normalizeElementType,
  pp90FromRecentOrSeason,
} from '../utils';
import type { BootstrapElement, ForecastCandidate, ForecastOptionsResp } from '../types';

export async function opForecastOptions(playerIdRaw: string): Promise<ForecastOptionsResp> {
  const boot = await getBootstrap();
  const fixtures = await getFixtures();

  const nextGw = nextGwFromEvents(boot.events ?? []);
  if (nextGw < 1 || nextGw > 38) throw new Error('nextGw invalid');

  const teamName = new Map<number, string>();
  for (const t of boot.teams ?? []) teamName.set(t.id, t.name);

  const elementById = new Map<number, BootstrapElement>();
  for (const e of boot.elements ?? []) elementById.set(e.id, e);

  const baseEl = elementById.get(Number(playerIdRaw));
  if (!baseEl) throw new Error('Unknown playerId');

  const basePosMaybe = normalizeElementType(baseEl.element_type);
  if (!basePosMaybe) throw new Error('Unsupported player position');
  const basePos = basePosMaybe;

  const basePrice = Number.isFinite(baseEl.now_cost) ? baseEl.now_cost / 10 : 0;
  const minPrice = Math.max(0, basePrice - 1.0);
  const maxPrice = basePrice + 1.0;

  const posElements: BootstrapElement[] = (boot.elements ?? []).filter(
    (e) => normalizeElementType(e.element_type) === basePos
  );

  const summaries = await mapLimit(posElements, 10, async (el) => {
    try {
      const summary = await getElementSummary(el.id);
      return { el, ok: true as const, summary };
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
    const baseSummary = await getElementSummary(baseEl.id);
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

  const base = uniq.get(String(baseEl.id));
  if (!base) throw new Error('Base forecast computation failed');

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

  return {
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
}

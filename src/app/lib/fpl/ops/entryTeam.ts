import { fetchJson } from '../http';
import { getBootstrap } from '../bootstrap';
import { lastFinishedGw, normalizeElementType } from '../utils';
import type { ApiEntryTeamResp, BootstrapElement, EntryResponse, PicksResponse, PrefillPlayer } from '../types';

export async function opEntryTeam(entryId: number, gw: number): Promise<ApiEntryTeamResp> {
  const boot = await getBootstrap();

  const lastGw = lastFinishedGw(boot.events ?? []);
  if (lastGw > 0 && gw > lastGw) {
    throw new Error(`GW (${gw}) is beyond last finished GW (${lastGw}).`);
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

  return { entryId, gw, teamName: teamNameStr, managerName: managerNameStr, squad };
}

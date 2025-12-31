import { getBootstrap } from '../bootstrap';
import { normalizeElementType } from '../utils';
import type { ApiPlayersResp } from '../types';

export async function opPlayers(): Promise<ApiPlayersResp> {
  const boot = await getBootstrap();

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

  return { players };
}

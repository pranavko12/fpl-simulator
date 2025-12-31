import { fetchJson } from './http';
import type { ElementSummary } from './types';

export function getElementSummary(id: number | string) {
  return fetchJson<ElementSummary>(`https://fantasy.premierleague.com/api/element-summary/${id}/`);
}

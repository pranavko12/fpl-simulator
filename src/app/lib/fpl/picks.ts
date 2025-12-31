import { fplFetchOrNull } from './client';
import type { PicksResponse } from './types';

export type GwCaptain = {
  gw: number;
  captainElement: number;
  viceElement: number | null;
};

function chunk<T>(arr: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export async function fetchCaptainsForGws(entryId: number, gws: number[], concurrency = 6) {
  const results: GwCaptain[] = [];
  const batches = chunk(gws, concurrency);

  for (const batch of batches) {
    const res = await Promise.all(
      batch.map(async (gw) => {
        const data = await fplFetchOrNull<PicksResponse>(`/entry/${entryId}/event/${gw}/picks/`, {
          timeoutMs: 6500,
          retries: 1,
          revalidateSeconds: 900,
        });

        if (!data?.picks?.length) return null;

        const captainElement = data.picks.find((p) => p.is_captain)?.element ?? null;
        const viceElement = data.picks.find((p) => p.is_vice_captain)?.element ?? null;

        if (!captainElement) return null;
        return { gw, captainElement, viceElement };
      })
    );

    for (const r of res) if (r) results.push(r);
  }

  results.sort((a, b) => a.gw - b.gw);
  return results;
}

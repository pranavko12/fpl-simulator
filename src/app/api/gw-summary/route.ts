export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

type ReqBody = { ids: number[]; from: number; to: number };
type HistoryRow = { round: number; total_points: number; value: number };

async function getBootstrap() {
  const res = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/', { cache: 'no-store' });
  if (!res.ok) throw new Error(`bootstrap ${res.status}`);
  const json = await res.json();
  return Array.isArray(json.elements)
    ? (json.elements as Array<{ id: number; code: number }>)
    : [];
}

function makeResolver(elements: Array<{ id: number; code: number }>) {
  const idSet = new Set(elements.map(e => e.id));
  const codeToId = new Map(elements.map(e => [e.code, e.id]));
  return (incoming: number): { elementId: number; isCode: boolean } => {
    if (idSet.has(incoming)) return { elementId: incoming, isCode: false }; // already element id
    const mapped = codeToId.get(incoming);
    return { elementId: mapped ?? incoming, isCode: mapped !== undefined };  // if code, map -> id
  };
}

async function fetchHistory(elementId: number): Promise<HistoryRow[]> {
  const res = await fetch(`https://fantasy.premierleague.com/api/element-summary/${elementId}/`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`element-summary ${elementId}: ${res.status}`);
  const json = await res.json();
  return Array.isArray(json.history) ? (json.history as HistoryRow[]) : [];
}

function sumPointsInRange(history: HistoryRow[], from: number, to: number): number {
  let sum = 0;
  for (const h of history) if (h.round >= from && h.round <= to) sum += h.total_points || 0;
  return sum;
}

function priceAtGW(history: HistoryRow[], gw: number): number | null {
  let latest: number | null = null;
  for (const h of history) if (h.round <= gw) latest = h.value;
  return latest != null ? latest / 10 : null;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export async function POST(req: Request) {
  try {
    const { ids, from, to } = (await req.json()) as ReqBody;
    if (!Array.isArray(ids) || typeof from !== 'number' || typeof to !== 'number' || from < 1 || to < from) {
      return NextResponse.json({ error: 'ids[], from>=1, to>=from required' }, { status: 400 });
    }

    const elements = await getBootstrap();
    const resolve = makeResolver(elements);

    // Build mapping: original -> elementId
    const idMap: Record<number, number> = {};
    const pairs = ids.map(orig => {
      const { elementId } = resolve(orig);
      idMap[orig] = elementId;
      return { orig, elementId };
    });

    // Fetch histories in batches
    const resultsByOrig: Record<number, {
      price_from: number | null;
      price_to: number | null;
      price_delta: number | null;
      points_range: number;
    }> = {};

    for (const group of chunk(pairs, 10)) {
      const settled = await Promise.allSettled(group.map(g => fetchHistory(g.elementId)));
      settled.forEach((r, i) => {
        const { orig, elementId } = group[i];
        if (r.status === 'fulfilled') {
          const hist = r.value;
          const pFrom = priceAtGW(hist, from);
          const pTo = priceAtGW(hist, to);
          resultsByOrig[orig] = {
            price_from: pFrom,
            price_to: pTo,
            price_delta: (pFrom != null && pTo != null) ? Number((pTo - pFrom).toFixed(1)) : null,
            points_range: sumPointsInRange(hist, from, to),
          };
        } else {
          resultsByOrig[orig] = { price_from: null, price_to: null, price_delta: null, points_range: 0 };
        }
      });
    }

    // Return both the mapping and results keyed by ORIGINAL ids
    return NextResponse.json({ idMap, resultsByOrig }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}

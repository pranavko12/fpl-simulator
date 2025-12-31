import { NextRequest, NextResponse } from 'next/server';

import {
  opPlayers,
  opEntryTeam,
  opStats,
  opBetterOptions,
  opForecastOptions,
} from '../../lib/fpl';


export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams;
    const op = q.get('op');

    if (op === 'players') {
      const data = await opPlayers();
      return NextResponse.json(data);
    }

    if (op === 'entry_team') {
      const entryId = Number(q.get('entryId'));
      const gw = Number(q.get('gw'));

      if (!Number.isFinite(entryId) || entryId <= 0) {
        return bad('entryId required');
      }
      if (!Number.isFinite(gw) || gw <= 0) {
        return bad('gw required');
      }

      const data = await opEntryTeam(entryId, gw);
      return NextResponse.json(data);
    }

    if (op === 'stats') {
      const idsRaw = q.get('ids') ?? '';
      const from = Number(q.get('from'));
      const to = Number(q.get('to'));

      if (!idsRaw) return bad('ids required');
      if (!Number.isFinite(from) || !Number.isFinite(to)) {
        return bad('from and to are required numbers');
      }

      const data = await opStats(idsRaw, from, to);
      return NextResponse.json(data);
    }

    if (op === 'better_options') {
      const playerId = (q.get('playerId') ?? '').trim();
      const from = Number(q.get('from'));
      const to = Number(q.get('to'));

      if (!/^\d+$/.test(playerId)) {
        return bad('playerId required');
      }
      if (!Number.isFinite(from) || !Number.isFinite(to)) {
        return bad('from and to are required numbers');
      }

      const data = await opBetterOptions(playerId, from, to);
      return NextResponse.json(data);
    }

    if (op === 'forecast_options') {
      const playerId = (q.get('playerId') ?? '').trim();

      if (!/^\d+$/.test(playerId)) {
        return bad('playerId required');
      }

      const data = await opForecastOptions(playerId);
      return NextResponse.json(data);
    }

    return bad('unknown op');
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

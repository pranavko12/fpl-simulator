const FPL_BASE = 'https://fantasy.premierleague.com/api';

type FetchOpts = {
  timeoutMs?: number;
  retries?: number;
  revalidateSeconds?: number;
};

export async function fplFetch<T>(path: string, opts: FetchOpts = {}): Promise<T> {
  const timeoutMs = opts.timeoutMs ?? 6500;
  const retries = opts.retries ?? 2;
  const revalidateSeconds = opts.revalidateSeconds ?? 300;

  let lastErr: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(`${FPL_BASE}${path}`, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
        next: { revalidate: revalidateSeconds },
      });

      if (!res.ok) throw new Error(`FPL fetch failed (${res.status}) for ${path}`);

      return (await res.json()) as T;
    } catch (e) {
      lastErr = e;
      if (attempt === retries) break;
      await new Promise(r => setTimeout(r, 250 * (attempt + 1)));
    } finally {
      clearTimeout(t);
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error('FPL fetch failed');
}

export async function fplFetchOrNull<T>(path: string, opts: FetchOpts = {}): Promise<T | null> {
  try {
    return await fplFetch<T>(path, opts);
  } catch {
    return null;
  }
}

export async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    cache: 'no-store',
    headers: {
      'user-agent': 'fpl-simulator/1.0',
      accept: 'application/json',
    },
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} for ${url}${txt ? `: ${txt}` : ''}`);
  }

  return (await res.json()) as T;
}

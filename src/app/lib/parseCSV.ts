// Minimal CSV parser with quoted field support, returns rows as string maps.
export type CSVRow = Record<string, string>;

export function parseCSV(text: string): CSVRow[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const n = text[i + 1];

    if (c === '"') {
      if (inQuotes && n === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      row.push(cur);
      cur = '';
    } else if ((c === '\n' || c === '\r') && !inQuotes) {
      if (cur !== '' || row.length) {
        row.push(cur);
        rows.push(row);
        row = [];
        cur = '';
      }
      if (c === '\r' && n === '\n') i++;
    } else {
      cur += c;
    }
  }
  if (cur !== '' || row.length) {
    row.push(cur);
    rows.push(row);
  }
  if (!rows.length) return [];

  const headers = rows[0].map((h) => h.trim());
  return rows
    .slice(1)
    .filter((r) => r.length && r.some((x) => x.trim() !== ''))
    .map((r) => {
      const o: CSVRow = {};
      headers.forEach((h, i) => {
        o[h] = (r[i] ?? '').trim();
      });
      return o;
    });
}

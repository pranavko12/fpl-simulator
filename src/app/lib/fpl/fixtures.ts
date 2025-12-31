import { fetchJson } from './http';
import type { Fixture } from './types';

const FIXTURES_URL = 'https://fantasy.premierleague.com/api/fixtures/';

export function getFixtures() {
  return fetchJson<Fixture[]>(FIXTURES_URL);
}

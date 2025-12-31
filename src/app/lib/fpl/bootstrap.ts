import { fetchJson } from './http';
import type { BootstrapStatic } from './types';

const BOOTSTRAP_URL = 'https://fantasy.premierleague.com/api/bootstrap-static/';

export function getBootstrap() {
  return fetchJson<BootstrapStatic>(BOOTSTRAP_URL);
}

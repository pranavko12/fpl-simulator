export type ElementType = 'GK' | 'DEF' | 'MID' | 'FWD';

export type BootstrapEvent = {
  id: number;
  finished: boolean;
  is_current: boolean;
  is_next: boolean;
};

export type BootstrapTeam = {
  id: number;
  name: string;
  short_name: string;
};

export type BootstrapElement = {
  id: number;
  code: number;
  web_name: string;
  element_type: number;
  team: number;
  now_cost: number;
  total_points: number;
  minutes: number;
};

export type BootstrapStatic = {
  events: BootstrapEvent[];
  teams: BootstrapTeam[];
  elements: BootstrapElement[];
};

export type Fixture = {
  id: number;
  event: number | null;
  team_h: number;
  team_a: number;
  team_h_difficulty: number;
  team_a_difficulty: number;
  kickoff_time: string | null;
};

export type EntryResponse = {
  name?: string;
  player_first_name?: string;
  player_last_name?: string;
};

export type PicksResponse = {
  picks: Array<{
    element: number;
    position: number;
    is_captain: boolean;
    is_vice_captain: boolean;
  }>;
};

export type ElementHistoryRow = {
  round: number;
  total_points: number;
  minutes: number;
  value?: number;
};

export type ElementSummary = {
  history: ElementHistoryRow[];
};

export type PrefillPlayer = {
  slot: number;
  isBench: boolean;
  id: string;
  name: string;
  element_type: ElementType | null;
  team: string;
  price: number | null;
  points: number | null;
};

export type ApiPlayersResp = {
  players: Array<{
    id: string;
    code: number | null;
    name: string;
    element_type: ElementType | null;
    price: number | null;
    team: string;
    points: number | null;
  }>;
};

export type ApiEntryTeamResp = {
  entryId: number;
  gw: number;
  teamName: string | null;
  managerName: string | null;
  squad: PrefillPlayer[];
};

export type ApiStatsResp = {
  from: number;
  to: number;
  lastFinishedGw: number;
  stats: Record<
    string,
    {
      from: { gw: number; points: number; price: number; found: boolean; priceFound: boolean };
      to: { gw: number; points: number; price: number; found: boolean; priceFound: boolean };
    }
  >;
  missing: Array<{ id: string; reason: string }>;
};

export type BetterCandidate = {
  id: string;
  code: number | null;
  name: string;
  team: string;
  pos: ElementType;
  priceFrom: number;
  priceTo: number;
  priceDelta: number;
  pointsFrom: number;
  pointsTo: number;
  pointsDelta: number;
};

export type BetterOptionsResp = {
  player: BetterCandidate;
  priceBand: { min: number; max: number };
  topByPriceIncrease: BetterCandidate[];
  topByPointsGained: BetterCandidate[];
  recommended: BetterCandidate | null;
  currentIsBestByPoints: boolean;
};

export type ForecastCandidate = {
  id: string;
  code: number | null;
  name: string;
  team: string;
  pos: ElementType;
  price: number;
  epNextGw: number;
  epNext5: number;
};

export type ForecastOptionsResp = {
  nextGw: number;
  player: ForecastCandidate;
  priceBand: { min: number; max: number };
  topNextGw: ForecastCandidate[];
  topNext5: ForecastCandidate[];
  recommendedNextGw: ForecastCandidate | null;
  recommendedNext5: ForecastCandidate | null;
  currentIsBestNextGw: boolean;
  currentIsBestNext5: boolean;
};

export type FplHistoryCurrentRow = {
  event: number;
  points: number;
  total_points: number;
  overall_rank: number;
  event_transfers: number;
  event_transfers_cost: number;
};

export type FplHistory = {
  current?: FplHistoryCurrentRow[];
  past?: Array<{
    season_name: string;
    total_points: number;
    rank: number;
  }>;
  chips?: Array<{
    name: string;
    time: string;
    event: number;
  }>;
};

export type FplEntry = {
  id: number;
  name: string;
  player_first_name: string;
  player_last_name: string;
  summary_overall_points: number;
  summary_overall_rank: number;
  summary_event_points: number;
  summary_event_rank: number;
  started_event: number;
  current_event: number;
  last_deadline_bank: number;
  last_deadline_value: number;
  last_deadline_total_transfers: number;
};

export type FplBootstrapStatic = BootstrapStatic;
export type FplTransfer = unknown;

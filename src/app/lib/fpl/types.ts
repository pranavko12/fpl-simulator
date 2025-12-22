export type FplEntry = {
  id: number;
  name: string;
  player_first_name: string;
  player_last_name: string;
  started_event: number;
  summary_overall_points: number;
  summary_overall_rank: number;
  summary_event_points: number;
  last_deadline_bank: number;
  last_deadline_value: number;
};

export type FplHistory = {
  current: Array<{
    event: number;
    points: number;
    total_points: number;
    rank: number;
    overall_rank: number;
    bank: number;
    value: number;
    event_transfers: number;
    event_transfers_cost: number;
  }>;
  chips: Array<{
    name: string;
    event: number;
    time: string;
  }>;
};

export type FplTransfer = {
  event: number;
  element_in: number;
  element_out: number;
  time: string;
  element_in_cost: number;
  element_out_cost: number;
};

export type FplBootstrapStatic = {
  elements: Array<{
    id: number;
    web_name: string;
    first_name: string;
    second_name: string;
    team: number;
    element_type: number;
  }>;
  teams: Array<{
    id: number;
    name: string;
    short_name: string;
  }>;
};

export type FplPicksResponse = {
  active_chip: string | null;
  picks: Array<{
    element: number;
    position: number;
    multiplier: number;
    is_captain: boolean;
    is_vice_captain: boolean;
  }>;
};

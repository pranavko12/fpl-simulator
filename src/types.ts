export type Position = 'GK' | 'DEF' | 'MID' | 'FWD';

export type Player = {
  // id from your CSV (keep it so your UI still works)
  id: number;

  // ✅ real FPL element id (we’ll fill this in server-side)
  element_id: number | null;

  first_name: string;
  second_name: string;
  web_name: string;
  element_type: Position;
  price: number;           // £x.y
  total_points: number;    // season total
  selected_by_percent?: number;
};

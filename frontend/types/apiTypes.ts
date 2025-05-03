export interface SimpleResponse {
  message: string;
}

export interface GameState {
  board: (number | null)[];
  players: Record<number, string | null>;
  move_number: number;
  current_player: number;
}

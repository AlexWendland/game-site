import { BoardValue } from "./gameTypes";

export interface SimpleResponse {
  message: string;
}

export interface GameState {
  board_history: BoardValue[];
  players: Record<number, string | null>;
}

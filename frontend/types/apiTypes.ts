import { BoardValue } from "./gameTypes";

export interface SimpleResponse {
  type: string;
  parameters: {
    message: string;
  };
}

export interface GameState {
  board_history: BoardValue[];
  players: Record<number, string | null>;
}

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

export enum GravitySetting {
  NONE = 1,
  BOTTOM = 2,
  EDGE = 3,
}

export enum Geometry {
  NO_GEOMETRY = 1,
  TORUS = 2,
  BAND = 3,
}

export interface TopologicalGameParameters {
  board_size: number; // 4 <= board_size <= 8
  gravity: GravitySetting;
  geometry: Geometry;
}

export enum GameType {
  TICTACTOE = "tictactoe",
  ULTIMATE = "ultimate",
  TOPOLOGICAL = "topological",
}

export interface TopologicalGameMetadata {
  game_type: GameType;
  max_players: number;
  parameters: TopologicalGameParameters;
}

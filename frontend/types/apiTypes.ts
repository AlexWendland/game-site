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
  NONE = "none",
  BOTTOM = "bottom",
  EDGE = "edge",
}

export enum Geometry {
  NO_GEOMETRY = "no_geometry",
  TORUS = "torus",
  BAND = "band",
  MOBIUS = "mobius",
  KLEIN = "klein",
  RP2 = "rp2",
  SPHERE = "sphere",
}

export interface TopologicalGameParameters {
  board_size: number; // 4 <= board_size <= 8
  gravity: GravitySetting;
  geometry: Geometry;
}

export interface WizardGameParameters {
  can_see_old_rounds: boolean;
}

export enum GameType {
  TICTACTOE = "tictactoe",
  ULTIMATE = "ultimate",
  TOPOLOGICAL = "topological",
  WIZARD = "wizard",
}

export interface TopologicalGameMetadata {
  game_type: GameType;
  max_players: number;
  parameters: TopologicalGameParameters;
}

export interface WizardGameMetadata {
  game_type: GameType;
  max_players: number;
  parameters: WizardGameParameters;
}

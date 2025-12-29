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

export enum QuantumHintLevel {
  NONE = 0,
  TRACK = 1,
  FULL = 2,
}

export interface TopologicalGameParameters {
  board_size: number; // 4 <= board_size <= 8
  gravity: GravitySetting;
  geometry: Geometry;
}

export interface WizardGameParameters {
  can_see_old_rounds: boolean;
}

export interface QuantumGameParameters {
  max_hint_level: QuantumHintLevel;
}

export enum GameType {
  TICTACTOE = "tictactoe",
  ULTIMATE = "ultimate",
  TOPOLOGICAL = "topological",
  WIZARD = "wizard",
  QUANTUM = "quantum",
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

export interface QuantumGameMetadata {
  game_type: GameType;
  max_players: number;
  parameters: QuantumGameParameters;
}

// Auth API types
export interface AuthResponse {
  token: string;
  user_id: string;
}

export interface UserInfo {
  user_id: string;
  username: string;
}

export interface ErrorResponse {
  error_message: string;
}

export interface PlayerInfo {
  user_id: string;
  display_name: string;
  is_ai: boolean;
}

import { Geometry, GravitySetting, SimpleResponse } from "@/types/apiTypes";

// Hack for now, as environment variables are not working in renderGameManager
const BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "https://games.awendland.co.uk/api";

export function apiUrl(path: string): string {
  return `${BASE_URL}${path}`;
}

export async function makeNewTicTacToeGameAPI(): Promise<string> {
  const response = await fetch(apiUrl(`/new_game/tictactoe`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  if (!response.ok) {
    throw new Error(`Error creating Tic Tac Toe game: ${response.statusText}`);
  }
  const data: SimpleResponse = await response.json();
  if (data.parameters.message) {
    return data.parameters.message;
  }
  throw new Error("Unexpected response format");
}

export async function makeNewUltimateGameAPI(): Promise<string> {
  const response = await fetch(apiUrl(`/new_game/ultimate`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  if (!response.ok) {
    throw new Error(`Error creating Ultimate game: ${response.statusText}`);
  }
  const data: SimpleResponse = await response.json();
  if (data.parameters.message) {
    return data.parameters.message;
  }
  throw new Error("Unexpected response format");
}

export async function makeNewTopologicalGameAPI(
  numberOfPlayers: number,
  boardSize: number,
  gravity: GravitySetting,
  geometry: Geometry,
): Promise<string> {
  const response = await fetch(apiUrl(`/new_game/topological`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      number_of_players: numberOfPlayers,
      board_size: boardSize,
      gravity: gravity,
      geometry: geometry,
    }),
  });
  if (!response.ok) {
    throw new Error(`Error creating Topological game: ${response.statusText}`);
  }
  const data: SimpleResponse = await response.json();
  if (data.parameters.message) {
    return data.parameters.message;
  }
  throw new Error("Unexpected response format");
}

export async function makeNewWizardGameAPI(
  numberOfPlayers: number,
  showOldHands: boolean,
): Promise<string> {
  const response = await fetch(apiUrl(`/new_game/wizard`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      number_of_players: numberOfPlayers,
      show_old_rounds: showOldHands,
    }),
  });
  if (!response.ok) {
    throw new Error(`Error creating Topological game: ${response.statusText}`);
  }
  const data: SimpleResponse = await response.json();
  if (data.parameters.message) {
    return data.parameters.message;
  }
  throw new Error("Unexpected response format");
}

interface GameMetadata {
  game_type: string;
  max_players: number;
  parameters: {};
}

export async function getGameMetadata(gameID: string): Promise<GameMetadata> {
  const response = await fetch(apiUrl(`/game/${gameID}/metadata`));

  if (!response.ok) {
    throw new Error(`Error fetching game metadata: ${response.statusText}`);
  }

  const data = await response.json();
  if (
    !data ||
    typeof data !== "object" ||
    typeof (data as any).game_type !== "string" ||
    typeof (data as any).max_players !== "number" ||
    typeof (data as any).parameters !== "object"
  ) {
    console.error("Invalid Metadata message format:", data);
    throw new Error("Invalid Metadata message format");
  }

  return data as GameMetadata;
}

interface GameModelResponse {
  message_type: string;
  parameters: {
    models: Record<string, string>;
  };
}

export async function getGameModels(
  gameName: string,
): Promise<Record<string, string>> {
  const response = await fetch(apiUrl(`/game/${gameName}/models`));
  if (!response.ok) {
    throw new Error(`Error fetching game AI models: ${response.statusText}`);
  }
  const data = await response.json();

  if (
    !data ||
    typeof data !== "object" ||
    data.message_type !== "model" ||
    typeof data.parameters !== "object" ||
    typeof data.parameters.models !== "object"
  ) {
    console.error("Invalid game model response format:", data);
    throw new Error("Invalid game model response format");
  }
  return data.parameters.models;
}

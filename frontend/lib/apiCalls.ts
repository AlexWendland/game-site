import { SimpleResponse } from "@/types/apiTypes";

// Hack for now, as environment variables are not working in renderGameManager
const BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "https://backend-87oq.onrender.com";

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

interface GameMetadata {
  game_type: string;
  max_players: number;
  parameters: {};
}

export async function getGameMetadata(gameID: string): Promise<GameMetadata> {
  const response = await fetch(apiUrl(`/game/${gameID}`));
  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Error fetching game metadata: ${response.statusText}`);
  }

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

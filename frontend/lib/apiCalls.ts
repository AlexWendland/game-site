import { GameState, SimpleResponse } from "@/types/apiTypes";

// Hack for now, as environment variables are not working in render
const BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "https://backend-87oq.onrender.com";

function apiUrl(path: string): string {
  return `${BASE_URL}${path}`;
}

export async function fetchBaseData(): Promise<string> {
  const response = await fetch(apiUrl("/"));
  if (!response.ok) {
    throw new Error(`Error fetching data: ${response.statusText}`);
  }
  const data: SimpleResponse = await response.json();
  if (data.message) {
    return data.message;
  }
  throw new Error("Unexpected response format");
}

export async function makeNewUltimateGame(): Promise<string> {
  const response = await fetch(apiUrl("/ultimate/new_game"));
  if (!response.ok) {
    throw new Error(`Error fetching data: ${response.statusText}`);
  }
  const data: SimpleResponse = await response.json();
  if (data.message) {
    return data.message;
  }
  throw new Error("Unexpected response format");
}

export async function getGameState(game_id: string): Promise<GameState> {
  const response = await fetch(apiUrl(`/ultimate/game/${game_id}`));
  if (!response.ok) {
    throw new Error(`Error fetching data: ${response.statusText}`);
  }
  const data: GameState = await response.json();
  return data;
}

export async function setPlayer(
  game_id: string,
  playerPosition: number,
  playerName: string,
): Promise<void> {
  const res = await fetch(apiUrl(`/ultimate/game/${game_id}/set_player`), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      player_position: playerPosition,
      player_name: playerName,
    }),
  });
  if (!res.ok) throw new Error("Failed to set player.");
}

export async function unsetPlayer(
  game_id: string,
  playerPosition: number,
  playerName: string,
): Promise<void> {
  const res = await fetch(apiUrl(`/ultimate/game/${game_id}/unset_player`), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      player_position: playerPosition,
      player_name: playerName,
    }),
  });
  if (!res.ok) throw new Error("Failed to unset player.");
}

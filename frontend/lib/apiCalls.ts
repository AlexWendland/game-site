import { GameState, SimpleResponse } from "@/types/apiTypes";

// Hack for now, as environment variables are not working in renderGameManager
const BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "https://backend-87oq.onrender.com";

export function apiUrl(path: string): string {
  return `${BASE_URL}${path}`;
}

export async function makeNewTicTacToeGameAPI(): Promise<string> {
  const response = await fetch(apiUrl(`/new_game`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      game_name: "tictactoe",
    }),
  });
  if (!response.ok) {
    throw new Error(`Error creating game: ${response.statusText}`);
  }
  const data: SimpleResponse = await response.json();
  if (data.parameters.message) {
    return data.parameters.message;
  }
  throw new Error("Unexpected response format");
}

export async function getGameStateAPI(game_id: string): Promise<GameState> {
  const response = await fetch(apiUrl(`/ultimate/game/${game_id}`));
  if (!response.ok) {
    throw new Error(`Error fetching data: ${response.statusText}`);
  }
  const data: GameState = await response.json();
  return data;
}

export async function setPlayerAPI(
  gameID: string,
  playerPosition: number,
  playerName: string,
): Promise<void> {
  const res = await fetch(apiUrl(`/ultimate/game/${gameID}/set_player`), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      player_position: playerPosition,
      player_name: playerName,
    }),
  });
  if (!res.ok) throw new Error("Failed to set player.");
}

export async function unsetPlayerAPI(
  gameID: string,
  playerPosition: number,
  playerName: string,
): Promise<void> {
  const res = await fetch(apiUrl(`/ultimate/game/${gameID}/unset_player`), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      player_position: playerPosition,
      player_name: playerName,
    }),
  });
  if (!res.ok) throw new Error("Failed to unset player.");
}

export async function makeMoveAPI(
  gameID: string,
  playerPosition: number,
  playerName: string,
  move: number,
): Promise<void> {
  const res = await fetch(apiUrl(`/ultimate/game/${gameID}/make_move`), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      player_position: playerPosition,
      player_name: playerName,
      move: move,
    }),
  });
  if (!res.ok) throw new Error("Failed to make move.");
}

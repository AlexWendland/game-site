import { SimpleResponse } from "@/types/apiTypes";

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

export async function getGameMetadata(gameID: string): Promise<null> {
  // Update this to get the game metadata.
  return null;
}

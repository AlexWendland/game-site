import {
  Geometry,
  GravitySetting,
  QuantumHintLevel,
  SimpleResponse,
} from "@/types/apiTypes";
import {
  AuthResponse,
  AuthResponseSchema,
  UserInfoResponse,
  UserInfoResponseSchema,
  WSTokenResponse,
  WSTokenResponseSchema,
} from "@/proto/auth_pb";
import { SimpleResponseSchema } from "@/proto/common_pb";
import { fromJson, fromJsonString } from "@bufbuild/protobuf";

// In production (static export), use relative URLs since the Go backend serves the frontend
// In development, use NEXT_PUBLIC_BACKEND_URL to point to the backend (e.g., http://localhost:8080)
const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "";

export function apiUrl(path: string): string {
  return `${BASE_URL}${path}`;
}

export async function makeNewTicTacToeGameAPI(token: string): Promise<string> {
  const response = await fetch(apiUrl(`/api/new_game/tictactoe`), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({}),
  });
  if (!response.ok) {
    throw new Error(`Error creating Tic Tac Toe game: ${response.statusText}`);
  }
  const json = await response.json();
  // Parse JSON into protobuf message
  const data = fromJson(SimpleResponseSchema, json);
  return data.message;
}

export async function makeNewUltimateGameAPI(): Promise<string> {
  const response = await fetch(apiUrl(`/api/new_game/ultimate`), {
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
  const response = await fetch(apiUrl(`/api/new_game/topological`), {
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

export async function makeNewQuantumGameAPI(
  numberOfPlayers: number,
  maxHintLevel: QuantumHintLevel,
): Promise<string> {
  const response = await fetch(apiUrl(`/new_game/quantum`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      number_of_players: numberOfPlayers,
      max_hint_level: maxHintLevel,
    }),
  });
  if (!response.ok) {
    throw new Error(`Error creating Quantum game: ${response.statusText}`);
  }
  const data: SimpleResponse = await response.json();
  if (data.parameters.message) {
    return data.parameters.message;
  }
  throw new Error("Unexpected response format");
}

export async function getGameMetadata(
  gameID: string,
  token: string,
): Promise<GameMetadata> {
  const response = await fetch(apiUrl(`/api/game/${gameID}/metadata`), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

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

export async function getGameModels(
  gameName: string,
  token: string,
): Promise<Record<string, string>> {
  const response = await fetch(apiUrl(`/api/game/${gameName}/models`), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    throw new Error(`Error fetching game AI models: ${response.statusText}`);
  }
  const data = await response.json();

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    console.error("Invalid game model response format:", data);
    throw new Error("Invalid game model response format - expected object");
  }
  return data as Record<string, string>;
}

export async function loginAPI(
  username: string,
  password: string,
): Promise<AuthResponse> {
  const response = await fetch(apiUrl("/auth/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    // Backend now returns plain text errors
    const errorMsg = await response.text();
    throw new Error(errorMsg || "Login failed");
  }

  const json = await response.json();
  // Parse JSON into protobuf message (converts user_id -> userId)
  return fromJson(AuthResponseSchema, json);
}

export async function registerAPI(
  username: string,
  password: string,
): Promise<AuthResponse> {
  const response = await fetch(apiUrl("/auth/register"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    // Backend now returns plain text errors
    const errorMsg = await response.text();
    throw new Error(errorMsg || "Registration failed");
  }

  const json = await response.json();
  // Parse JSON into protobuf message (converts user_id -> userId)
  return fromJson(AuthResponseSchema, json);
}

export async function logoutAPI(token: string): Promise<void> {
  const response = await fetch(apiUrl("/auth/logout"), {
    method: "POST",
    headers: { Authorization: token },
  });

  if (!response.ok) {
    throw new Error("Logout failed");
  }
}

export async function getUserInfoAPI(token: string): Promise<UserInfoResponse> {
  const response = await fetch(apiUrl("/auth/me"), {
    headers: { Authorization: token },
  });

  if (!response.ok) {
    // Backend now returns plain text errors
    const errorMsg = await response.text();
    throw new Error(errorMsg || "Failed to get user info");
  }

  const json = await response.json();
  // Parse JSON into protobuf message (converts user_id -> userId)
  return fromJson(UserInfoResponseSchema, json);
}

export async function getWSTokenAPI(
  token: string,
  gameID: string,
): Promise<string> {
  const response = await fetch(apiUrl(`/auth/ws-token/${gameID}`), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    // Backend now returns plain text errors
    const errorMsg = await response.text();
    throw new Error(errorMsg || "Failed to get WebSocket token");
  }

  const json = await response.json();
  // Parse JSON into protobuf message (converts ws_token -> wsToken)
  const wsTokenResponse = fromJson(WSTokenResponseSchema, json);
  return wsTokenResponse.wsToken;
}

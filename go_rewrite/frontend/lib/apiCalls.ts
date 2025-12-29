import {
  Geometry,
  GravitySetting,
  QuantumHintLevel,
  SimpleResponse,
  AuthResponse,
  UserInfo,
} from "@/types/apiTypes";

// Hack for now, as environment variables are not working in renderGameManager
const BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "https://games.awendland.co.uk";

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
  const data: SimpleResponse = await response.json();
  if (data.parameters.message) {
    return data.parameters.message;
  }
  throw new Error("Unexpected response format");
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

  const data = await response.json();

  if (!response.ok) {
    const errorMsg = data.parameters?.error_message || "Login failed";
    throw new Error(errorMsg);
  }

  return {
    token: data.parameters.token,
    user_id: data.parameters.user_id,
  };
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

  const data = await response.json();

  if (!response.ok) {
    const errorMsg = data.parameters?.error_message || "Registration failed";
    throw new Error(errorMsg);
  }

  return {
    token: data.parameters.token,
    user_id: data.parameters.user_id,
  };
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

export async function getUserInfoAPI(token: string): Promise<UserInfo> {
  const response = await fetch(apiUrl("/auth/me"), {
    headers: { Authorization: token },
  });

  const data = await response.json();

  if (!response.ok) {
    const errorMsg =
      data.parameters?.error_message || "Failed to get user info";
    throw new Error(errorMsg);
  }

  return {
    user_id: data.parameters.user_id,
    username: data.parameters.username,
  };
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

  const data = await response.json();

  if (!response.ok) {
    const errorMsg =
      data.parameters?.error_message || "Failed to get WebSocket token";
    throw new Error(errorMsg);
  }

  return data.parameters.ws_token;
}

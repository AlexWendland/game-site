import { apiUrl } from "@/lib/apiCalls";

export async function getGameWebsocket(gameID: string): Promise<WebSocket> {
  const socket = new WebSocket(apiUrl(`/game/${gameID}/ws`));

  await waitForSocketOpen(socket);

  socket.addEventListener("close", () => {
    console.log("WebSocket connection closed");
  });

  socket.addEventListener("error", (error) => {
    console.error("WebSocket error:", error);
  });

  return socket;
}

function waitForSocketOpen(socket: WebSocket): Promise<void> {
  return new Promise((resolve, reject) => {
    if (socket.readyState === WebSocket.OPEN) {
      resolve();
    } else {
      socket.addEventListener("open", () => {
        console.log("WebSocket connection opened");
        resolve();
      });
      socket.addEventListener("error", (err) => reject(err));
    }
  });
}

export function setPlayerNameWebsocket(
  playerName: string,
  webSocket: WebSocket | null,
): void {
  if (!webSocket) {
    return;
  }
  webSocket.send(
    JSON.stringify({
      request_type: "session",
      function_name: "set_player_name",
      parameters: { player_name: playerName },
    }),
  );
}

export function setPlayerPosition(
  playerPosition: number,
  webSocket: WebSocket | null,
): void {
  if (!webSocket) {
    return;
  }
  webSocket.send(
    JSON.stringify({
      request_type: "session",
      function_name: "set_player_position",
      parameters: { new_position: playerPosition },
    }),
  );
}

export function leavePlayerPosition(webSocket: WebSocket | null): void {
  if (!webSocket) {
    return;
  }
  webSocket.send(
    JSON.stringify({
      request_type: "session",
      function_name: "leave_player_position",
      parameters: {},
    }),
  );
}

export function removeAIPlayer(webSocket: WebSocket | null, position: number): void {
  if (!webSocket) {
    return;
  }
  webSocket.send(
    JSON.stringify({
      request_type: "ai",
      function_name: "remove_ai",
      parameters: {position: position},
    }),
  );
}

export function addAIPlayer(webSocket: WebSocket | null, position: number, model: string): void {
  if (!webSocket) {
    return;
  }
  webSocket.send(
    JSON.stringify({
      request_type: "ai",
      function_name: "add_ai",
      parameters: {position: position, ai_model: model},
    }),
  );
}

interface SessionStateMessage {
  message_type: "session_state";
  parameters: {
    player_positions: Record<number, string | null>;
    user_position: number | null;
  };
}

interface AIStateMessage {
  message_type: "ai_players";
  parameters: {
    ai_players: Record<number, string>;
  };
}

interface ErrorMessage {
  message_type: "error";
  parameters: {
    error_message: string;
  };
}

interface SimpleMessage {
  message_type: "simple";
  parameters: {
    message: string;
  };
}

interface GameStateMessage {
  message_type: "game_state";
  parameters: Record<string, any>; // Define a stricter interface if you can
}

interface UnknownMessage {
  message_type: "unknown";
  parameters: null;
}

export type ParsedMessage =
  | SessionStateMessage
  | ErrorMessage
  | SimpleMessage
  | GameStateMessage
  | UnknownMessage
  | AIStateMessage;

export function parseWebSocketMessage(event: MessageEvent): ParsedMessage {
  try {
    let rawData = event.data;
    let data: unknown = JSON.parse(rawData);

    if (typeof data === "string") {
      data = JSON.parse(data);
    }

    if (
      !data ||
      typeof data !== "object" ||
      typeof (data as any).message_type !== "string" ||
      typeof (data as any).parameters !== "object"
    ) {
      console.error("Invalid WebSocket message format:", data);
      console.log("Invalid WebSocket message format:", data);
      return {
        message_type: "unknown",
        parameters: null,
      };
    }

    const { message_type, parameters } = data as any;

    switch (message_type) {
      case "session_state":
        if (
          parameters &&
          typeof parameters.player_positions === "object" &&
          "user_position" in parameters
        ) {
          return {
            message_type: "session_state",
            parameters,
          };
        }
        break;
      case "ai_players":
        if (
          parameters &&
          typeof parameters.ai_players === "object"
        ) {
          return {
            message_type: "ai_players",
            parameters,
          };
        }
        break;
      case "error":
        if (parameters && typeof parameters.error_message === "string") {
          return {
            message_type: "error",
            parameters,
          };
        }
        break;

      case "game_state":
        return {
          message_type: "game_state",
          parameters,
        };
      case "simple":
        return {
          message_type: "simple",
          parameters,
        };
    }

    return {
      message_type: "unknown",
      parameters: null,
    };
  } catch (err) {
    console.error("Error parsing WebSocket message:", err);
    return {
      message_type: "unknown",
      parameters: null,
    };
  }
}

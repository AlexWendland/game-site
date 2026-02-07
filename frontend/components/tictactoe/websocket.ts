import { create, toJsonString, fromJsonString } from "@bufbuild/protobuf";
import {
  ClientTicTacToeWebsocketMessageSchema,
  ServerTicTacToeWebsocketMessageSchema,
  MakeMoveRequestSchema,
  TicTacToeAddAIPlayerInPositionRequestSchema,
  type ServerTicTacToeWebsocketMessage,
  type TicTacToeGameState,
  TicTacToeModel,
} from "@/proto/tictactoe_pb";
import {
  SetPlayerPositionRequestSchema,
  RemovePlayerPositionRequestSchema,
  type PositionSessionStateResponse,
} from "@/proto/lobby_pb";
import { type ErrorResponse, type SimpleResponse } from "@/proto/common_pb";

/**
 * Parse a TicTacToe WebSocket message from the server (JSON format)
 */
export function parseTicTacToeMessage(
  event: MessageEvent,
): ServerTicTacToeWebsocketMessage {
  const jsonString = event.data;
  return fromJsonString(ServerTicTacToeWebsocketMessageSchema, jsonString);
}

/**
 * Send a make move request for TicTacToe
 */
export function makeMoveOverWebsocket(
  webSocket: WebSocket | null,
  position: number,
): void {
  if (!webSocket) return;

  const moveRequest = create(MakeMoveRequestSchema, {
    position,
  });

  const message = create(ClientTicTacToeWebsocketMessageSchema, {
    message: {
      case: "makeMove",
      value: moveRequest,
    },
  });

  const jsonString = toJsonString(
    ClientTicTacToeWebsocketMessageSchema,
    message,
  );
  webSocket.send(jsonString);
}

/**
 * Set player position for TicTacToe
 */
export function setPlayerPosition(
  webSocket: WebSocket | null,
  position: number,
): void {
  if (!webSocket) return;

  const positionRequest = create(SetPlayerPositionRequestSchema, {
    position,
  });

  const message = create(ClientTicTacToeWebsocketMessageSchema, {
    message: {
      case: "setPlayerPosition",
      value: positionRequest,
    },
  });

  const jsonString = toJsonString(
    ClientTicTacToeWebsocketMessageSchema,
    message,
  );
  webSocket.send(jsonString);
}

/**
 * Leave player position for TicTacToe
 */
export function leavePlayerPosition(
  webSocket: WebSocket | null,
  position: number,
): void {
  if (!webSocket) return;

  const removeRequest = create(RemovePlayerPositionRequestSchema, {
    position,
  });

  const message = create(ClientTicTacToeWebsocketMessageSchema, {
    message: {
      case: "removePlayerPosition",
      value: removeRequest,
    },
  });

  const jsonString = toJsonString(
    ClientTicTacToeWebsocketMessageSchema,
    message,
  );
  webSocket.send(jsonString);
}

/**
 * Add AI player for TicTacToe
 */
export function addAIPlayerOverWebsocket(
  webSocket: WebSocket | null,
  position: number,
  model: string,
): void {
  if (!webSocket) return;

  // Map string model to TicTacToeModel enum
  let modelEnum: TicTacToeModel;
  switch (model.toLowerCase()) {
    case "easy":
      modelEnum = TicTacToeModel.EASY;
      break;
    case "medium":
      modelEnum = TicTacToeModel.MEDIUM;
      break;
    case "hard":
      modelEnum = TicTacToeModel.HARD;
      break;
    default:
      modelEnum = TicTacToeModel.UNSPECIFIED;
  }

  const aiRequest = create(TicTacToeAddAIPlayerInPositionRequestSchema, {
    position,
    model: modelEnum,
  });

  const message = create(ClientTicTacToeWebsocketMessageSchema, {
    message: {
      case: "addAiPlayer",
      value: aiRequest,
    },
  });

  const jsonString = toJsonString(
    ClientTicTacToeWebsocketMessageSchema,
    message,
  );
  webSocket.send(jsonString);
}

/**
 * Remove AI player for TicTacToe
 */
export function removeAIPlayerOverWebsocket(
  webSocket: WebSocket | null,
  position: number,
): void {
  if (!webSocket) return;

  const removeRequest = create(RemovePlayerPositionRequestSchema, {
    position,
  });

  const message = create(ClientTicTacToeWebsocketMessageSchema, {
    message: {
      case: "removePlayerPosition",
      value: removeRequest,
    },
  });

  const jsonString = toJsonString(
    ClientTicTacToeWebsocketMessageSchema,
    message,
  );
  webSocket.send(jsonString);
}

/**
 * Type guard to check if a message is a game state message
 */
export function isGameStateMessage(
  msg: ServerTicTacToeWebsocketMessage,
): msg is ServerTicTacToeWebsocketMessage & {
  message: { case: "gameState"; value: TicTacToeGameState };
} {
  return msg.message.case === "gameState";
}

/**
 * Type guard to check if a message is a session state message
 */
export function isSessionStateMessage(
  msg: ServerTicTacToeWebsocketMessage,
): msg is ServerTicTacToeWebsocketMessage & {
  message: { case: "sessionState"; value: PositionSessionStateResponse };
} {
  return msg.message.case === "sessionState";
}

/**
 * Type guard to check if a message is an error message
 */
export function isErrorMessage(
  msg: ServerTicTacToeWebsocketMessage,
): msg is ServerTicTacToeWebsocketMessage & {
  message: { case: "error"; value: ErrorResponse };
} {
  return msg.message.case === "error";
}

/**
 * Type guard to check if a message is a simple response message
 */
export function isSimpleMessage(
  msg: ServerTicTacToeWebsocketMessage,
): msg is ServerTicTacToeWebsocketMessage & {
  message: { case: "simpleResponse"; value: SimpleResponse };
} {
  return msg.message.case === "simpleResponse";
}

"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useMemo,
  ReactNode,
} from "react";
import { getGameWebsocket } from "@/lib/websocketFunctions";
import {
  parseTicTacToeMessage,
  makeMoveOverWebsocket,
  setPlayerPosition,
  leavePlayerPosition,
  addAIPlayerOverWebsocket,
  removeAIPlayerOverWebsocket,
  isGameStateMessage,
  isSessionStateMessage,
  isErrorMessage,
  isSimpleMessage,
} from "./websocket";
import { useToast } from "@/context/ToastContext";
import { usePathname } from "next/navigation";
import { useGameContext } from "@/context/GameContext";
import { getGameModels } from "@/lib/apiCalls";
import { useAuth } from "@/context/AuthContext";
import type { TicTacToeGameState } from "@/proto/tictactoe_pb";
import type { PlayerInfo } from "@/proto/common_pb";

// ============================================================================
// Context Types
// ============================================================================

type TicTacToeContextType = {
  // Game state (directly from protobuf)
  gameState: TicTacToeGameState | null;
  players: Record<number, PlayerInfo>;

  // Computed values
  currentMove: number;
  currentPlayerNumber: number;
  isCurrentUsersGo: boolean;

  // Client-side state
  currentUserPosition: number | null;
  currentViewedMove: number;
  setCurrentViewedMove: (move: number) => void;

  // AI models
  aiModels: Record<string, string>;

  // Actions
  makeMove: (position: number) => void;
  updateCurrentUserPosition: (position: number | null) => Promise<void>;
  addAIPlayer: (position: number, model: string) => Promise<void>;
  removeAIPlayer: (position: number) => Promise<void>;
};

const TicTacToeContext = createContext<TicTacToeContextType | null>(null);

export const useTicTacToeContext = () => {
  const context = useContext(TicTacToeContext);
  if (!context) {
    throw new Error(
      "useTicTacToeContext must be used within a TicTacToeProvider",
    );
  }
  return context;
};

// ============================================================================
// Provider
// ============================================================================

export function TicTacToeProvider({
  gameID,
  children,
}: {
  gameID: string;
  children: ReactNode;
}) {
  // State - using protobuf types directly
  const [gameState, setGameState] = useState<TicTacToeGameState | null>(null);
  const [players, setPlayers] = useState<Record<number, PlayerInfo>>({});
  const [aiModels, setAIModels] = useState<Record<string, string>>({});
  const [currentUserPosition, setCurrentUserPosition] = useState<number | null>(
    null,
  );
  const [currentViewedMove, setCurrentViewedMove] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Refs
  const gameWebSocket = useRef<WebSocket | null>(null);

  // Hooks
  const { addToast } = useToast();
  const { getToken } = useAuth();
  const {
    setGameCode,
    setGameLink,
    setGameState: setGameStatus,
    clearGame,
  } = useGameContext();
  const pathname = usePathname();

  // ============================================================================
  // WebSocket Connection
  // ============================================================================

  useEffect(() => {
    let isMounted = true;

    const connectWebSocket = async () => {
      try {
        const token = getToken();
        if (!token) {
          throw new Error("No authentication token available");
        }
        const webSocket = await getGameWebsocket(gameID, token);
        setIsLoading(false);

        if (!isMounted) return;

        gameWebSocket.current = webSocket;
        webSocket.addEventListener("message", (event) => {
          try {
            const message = parseTicTacToeMessage(event);

            if (isSessionStateMessage(message)) {
              // Store protobuf PlayerInfo directly (no conversion!)
              const playerPositions: Record<number, PlayerInfo> = {};
              Object.entries(message.message.value.playerPositions).forEach(
                ([pos, playerInfo]) => {
                  if (playerInfo) {
                    playerPositions[parseInt(pos)] = playerInfo;
                  }
                },
              );
              setPlayers(playerPositions);
            } else if (isErrorMessage(message)) {
              addToast({
                message: message.message.value.errorMessage,
                type: "error",
              });
            } else if (isGameStateMessage(message)) {
              const newGameState = message.message.value;
              const previousMaxMove = gameState
                ? Math.max(...gameState.board) + 1
                : 0;

              setGameState(newGameState);

              // Auto-advance viewed move if we were watching latest
              const maxMove = Math.max(...newGameState.board);
              const calculatedMove = maxMove + 1;
              if (
                previousMaxMove !== calculatedMove &&
                currentViewedMove === calculatedMove - 1
              ) {
                setCurrentViewedMove(calculatedMove);
              }
            } else if (isSimpleMessage(message)) {
              console.log(message.message.value.message);
            }
          } catch (err) {
            console.error("Error processing message:", err);
          }
        });

        webSocket.addEventListener("close", () => {
          console.log("WebSocket disconnected");
        });

        webSocket.addEventListener("error", (error) => {
          console.error("WebSocket error:", error);
        });
      } catch (err) {
        console.error("Failed to connect WebSocket:", err);
      }
    };

    connectWebSocket();

    return () => {
      isMounted = false;
      if (gameWebSocket.current) {
        gameWebSocket.current.close();
        gameWebSocket.current = null;
      }
    };
  }, [gameID]);

  // ============================================================================
  // Fetch AI Models
  // ============================================================================

  useEffect(() => {
    const fetchAIModels = async () => {
      try {
        const token = getToken();
        if (!token) {
          console.error("No auth token available");
          return;
        }
        const models = await getGameModels(gameID, token);
        setAIModels(models);
      } catch (error) {
        console.error("Failed to fetch AI models:", error);
      }
    };
    fetchAIModels();
  }, [gameID, getToken]);

  // ============================================================================
  // Game Context Integration
  // ============================================================================

  useEffect(() => {
    setGameCode(gameID);
    setGameLink(pathname);
    setGameStatus("Pending game start");
    return () => {
      clearGame();
    };
  }, [gameID, pathname, setGameCode, setGameLink, setGameStatus, clearGame]);

  // ============================================================================
  // Computed Values
  // ============================================================================

  const currentMove = useMemo(() => {
    if (!gameState) return 0;
    const maxMove = Math.max(...gameState.board);
    return maxMove + 1;
  }, [gameState]);

  const currentPlayerNumber = useMemo(() => {
    return currentMove % 2;
  }, [currentMove]);

  const isCurrentUsersGo = useMemo(() => {
    const winner = gameState?.winner ?? null;
    return currentUserPosition === currentPlayerNumber && winner === null;
  }, [currentUserPosition, currentPlayerNumber, gameState?.winner]);

  // Update game status
  useEffect(() => {
    if (!gameState) return;

    const winner = gameState.winner ?? null;
    if (winner !== null || currentMove === 9) {
      setGameStatus("Game over");
    } else if (currentMove > 0) {
      setGameStatus("In game");
    }
  }, [currentMove, gameState?.winner, setGameStatus]);

  // ============================================================================
  // Actions
  // ============================================================================

  const updateCurrentUserPosition = async (newPosition: number | null) => {
    if (newPosition === null && currentUserPosition !== null) {
      leavePlayerPosition(gameWebSocket.current, currentUserPosition);
      setCurrentUserPosition(null);
    } else if (newPosition !== null) {
      setPlayerPosition(gameWebSocket.current, newPosition);
      setCurrentUserPosition(newPosition);
    }
  };

  const makeMove = (position: number) => {
    if (!gameState) return;
    const winner = gameState.winner ?? null;
    if (winner !== null) return;
    if (gameState.board[position] !== -1) return; // Position already taken
    if (currentUserPosition !== currentPlayerNumber) return;
    if (currentViewedMove !== currentMove) return;
    makeMoveOverWebsocket(gameWebSocket.current, position);
  };

  const removeAIPlayer = async (position: number) => {
    removeAIPlayerOverWebsocket(gameWebSocket.current, position);
  };

  const addAIPlayer = async (position: number, model: string) => {
    addAIPlayerOverWebsocket(gameWebSocket.current, position, model);
  };

  // ============================================================================
  // Render
  // ============================================================================

  if (isLoading) return <div>Loading game...</div>;

  return (
    <TicTacToeContext.Provider
      value={{
        gameState,
        players,
        currentMove,
        currentPlayerNumber,
        isCurrentUsersGo,
        currentUserPosition,
        currentViewedMove,
        setCurrentViewedMove,
        aiModels,
        makeMove,
        updateCurrentUserPosition,
        addAIPlayer,
        removeAIPlayer,
      }}
    >
      {children}
    </TicTacToeContext.Provider>
  );
}

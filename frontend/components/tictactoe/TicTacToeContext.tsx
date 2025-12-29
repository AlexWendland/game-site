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
import { PlayerInfo } from "@/types/apiTypes";
import {
  getGameWebsocket,
  leavePlayerPosition,
  parseWebSocketMessage,
  setPlayerPosition,
  addAIPlayerOverWebsocket,
  removeAIPlayerOverWebsocket,
} from "@/lib/websocketFunctions";
import { useToast } from "@/context/ToastContext";
import { usePathname } from "next/navigation";
import { useGameContext } from "@/context/GameContext";
import { getGameModels } from "@/lib/apiCalls";
import { useAuth } from "@/context/AuthContext";

type TicTacToeBoardContextType = {
  board: number[];
  currentMove: number;
  winningLine: number[];
  currentViewedMove: number;
  isCurrentUsersGo: boolean;
  currentPlayerNumber: number | null;
  makeMove: (position: number) => void;
};

type TicTacToeGameContextType = {
  players: Record<number, PlayerInfo | null>;
  currentMove: number;
  currentPlayer: PlayerInfo | null;
  winner: number | null;
  currentViewedMove: number;
  setCurrentViewedMove: (newMove: number) => void;
};

type TicTacToePlayerContextType = {
  players: Record<number, PlayerInfo | null>;
  currentUserPosition: number | null;
  aiModels: Record<string, string>;
  currentPlayerNumber: number | null;
  updateCurrentUserPosition: (newPosition: number | null) => Promise<void>;
  removeAIPlayer: (position: number) => Promise<void>;
  addAIPlayer: (position: number, model: string) => Promise<void>;
};

type TicTacToeGameState = {
  board: number[];
  winner: number | null;
  winning_line: number[];
};

function parseGameState(
  parameters: Record<string, any>,
): TicTacToeGameState | null {
  if (
    !Array.isArray((parameters as any).board) ||
    !("winner" in parameters) ||
    !Array.isArray((parameters as any).winning_line)
  ) {
    console.log("Invalid game state format:", parameters);
    throw new Error("Invalid structure");
  }
  return parameters as TicTacToeGameState;
}

export function makeMoveOverWebsocket(
  webSocket: WebSocket | null,
  position: number,
): void {
  if (!webSocket) {
    return;
  }
  webSocket.send(
    JSON.stringify({
      request_type: "game",
      function_name: "make_move",
      parameters: {
        position: position,
      },
    }),
  );
}

const TicTacToeBoardContext = createContext<TicTacToeBoardContextType | null>(
  null,
);
const TicTacToePlayerContext = createContext<TicTacToePlayerContextType | null>(
  null,
);
const TicTacToeGameContext = createContext<TicTacToeGameContextType | null>(
  null,
);

export const useTicTacToeBoardContext = () => {
  const context = useContext(TicTacToeBoardContext);
  if (!context) {
    throw new Error(
      "useTicTacToeBoardContext must be used within a TicTacToeProvider",
    );
  }
  return context;
};

export const useTicTacToePlayerContext = () => {
  const context = useContext(TicTacToePlayerContext);
  if (!context) {
    throw new Error(
      "useTicTacToePlayerContext must be used within a TicTacToeProvider",
    );
  }
  return context;
};

export const useTicTacToeGameContext = () => {
  const context = useContext(TicTacToeGameContext);
  if (!context) {
    throw new Error(
      "useTicTacToeGameContext must be used within a TicTacToeProvider",
    );
  }
  return context;
};

export function TicTacToeProvider({
  gameID,
  children,
}: {
  gameID: string;
  children: ReactNode;
}) {
  // Backend state
  const [board, setBoard] = useState<number[]>(Array(9).fill(-1));
  const [players, setPlayers] = useState<Record<number, PlayerInfo | null>>({
    0: null,
    1: null,
  });
  const [aiModels, setAIModels] = useState<Record<string, string>>({});
  const [winner, setWinner] = useState<number | null>(null);
  const [winningLine, setWinningLine] = useState<number[]>([]);
  // Client state
  const [currentUserPosition, setCurrentUserPosition] = useState<number | null>(
    null,
  );
  const [currentViewedMove, setCurrentViewedMove] = useState(0);
  // Initial loading of state
  const [isLoading, setIsLoading] = useState(true);
  // Websocket
  const gameWebSocket = useRef<WebSocket | null>(null);
  const { addToast } = useToast();
  const { getToken } = useAuth();

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

        if (!isMounted) return; // handle fast unmount

        gameWebSocket.current = webSocket;
        webSocket.addEventListener("message", (event) => {
          try {
            const parsedMessage = parseWebSocketMessage(event);

            switch (parsedMessage.message_type) {
              case "session_state":
                // TODO: Work out to set user position
                // setCurrentUserPosition();
                setPlayers(parsedMessage.parameters.player_positions);
                break;

              case "error":
                addToast({
                  message: parsedMessage.parameters.error_message,
                  type: "error",
                });
                break;

              case "game_state": {
                const gameState = parseGameState(parsedMessage.parameters);
                if (!gameState) {
                  console.error(
                    "Invalid game state: " + parsedMessage.parameters,
                  );
                  return;
                }
                const previousMaxMove = Math.max(...board) + 1;
                setBoard(gameState.board);
                setWinningLine(gameState.winning_line);
                setWinner(gameState.winner);
                // Calculate current move from board (max move number + 1)
                const maxMove = Math.max(...gameState.board);
                const calculatedMove = maxMove + 1;
                if (
                  previousMaxMove !== calculatedMove &&
                  currentViewedMove === calculatedMove - 1
                ) {
                  setCurrentViewedMove(calculatedMove);
                }
                break;
              }
              case "simple":
                console.log(parsedMessage.parameters.message);

              case "unknown":
              default:
                break;
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

  // Get AI models
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

  // Set game details in context.
  const {
    gameCode,
    setGameCode,
    gameLink,
    setGameLink,
    gameState,
    setGameState,
    clearGame,
  } = useGameContext();
  const pathname = usePathname();

  useEffect(() => {
    setGameCode(gameID);
    setGameLink(pathname);
    setGameState("Pending game start");
    return () => {
      clearGame();
    };
  }, [gameID]);

  // Define meta parameters

  const currentMove = useMemo(() => {
    // Calculate current move from board (max move number + 1)
    const maxMove = Math.max(...board);
    return maxMove + 1;
  }, [board]);

  const currentPlayerNumber = useMemo(() => {
    return currentMove % 2;
  }, [currentMove]);
  const currentPlayer = useMemo(() => {
    return players[currentPlayerNumber];
  }, [currentPlayerNumber, players]);
  const isCurrentUsersGo = useMemo(() => {
    return currentUserPosition === currentPlayerNumber && winner === null;
  }, [currentUserPosition, currentPlayerNumber, winner]);

  useEffect(() => {
    if (winner !== null || currentMove === 9) {
      setGameState("Game over");
      return;
    } else if (currentMove > 0) {
      setGameState("In game");
    }
  }, [currentMove, winner]);

  // Define utility functions

  const updateCurrentUserPosition = async (newPosition: number | null) => {
    if (newPosition === null) {
      leavePlayerPosition(gameWebSocket.current);
      setCurrentUserPosition(null);
    } else {
      setPlayerPosition(newPosition, gameWebSocket.current);
    }
  };

  const makeMove = async (position: number) => {
    if (winner !== null) return;
    if (board[position] !== -1) return; // Position already taken
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

  // Provide tsx
  if (isLoading) return <div>Loading game... </div>;

  return (
    <TicTacToeBoardContext.Provider
      value={{
        board,
        currentMove,
        winningLine,
        currentViewedMove,
        isCurrentUsersGo,
        currentPlayerNumber: winner === null ? currentPlayerNumber : null,
        makeMove,
      }}
    >
      <TicTacToePlayerContext.Provider
        value={{
          players,
          currentUserPosition,
          aiModels,
          currentPlayerNumber: winner === null ? currentPlayerNumber : null,
          updateCurrentUserPosition,
          addAIPlayer,
          removeAIPlayer,
        }}
      >
        <TicTacToeGameContext.Provider
          value={{
            players,
            currentMove,
            currentPlayer,
            winner,
            currentViewedMove,
            setCurrentViewedMove,
          }}
        >
          {children}
        </TicTacToeGameContext.Provider>
      </TicTacToePlayerContext.Provider>
    </TicTacToeBoardContext.Provider>
  );
}

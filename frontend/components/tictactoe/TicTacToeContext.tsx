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
import { BoardValue, SquareValue } from "@/types/gameTypes";
import {
  getGameWebsocket,
  leavePlayerPosition,
  parseWebSocketMessage,
  setPlayerNameWebsocket,
  setPlayerPosition,
} from "@/lib/websocketFunctions";
import { addToast } from "@heroui/react";
import { usePathname } from "next/navigation";
import { useGameContext } from "@/context/GameContext";
import { useUserContext } from "@/context/UserContext";

type TicTacToeContextType = {
  // Backend state
  history: BoardValue[];
  players: Record<number, string | null>;
  winner: number | null;
  winningLine: number[];
  // Metadata on state
  currentMove: number;
  currentPlayer: string | null;
  // Client state
  currentUserPosition: number | null;
  currentViewedMove: number;
  // Functions
  setCurrentViewedMove: (newMove: number) => void;
  updateCurrentUserPosition: (newPosition: number | null) => Promise<void>;
  makeMove: (position: number) => void;
};

type TicTacToeGameState = {
  history: BoardValue[];
  winner: SquareValue;
  winning_line: number[];
};

function parseGameState(
  parameters: Record<string, any>,
): TicTacToeGameState | null {
  if (
    typeof (parameters as any).history !== "object" ||
    !("winner" in parameters) ||
    typeof (parameters as any).winning_line !== "object"
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

const TicTacToeContext = createContext<TicTacToeContextType | null>(null);

export const useTicTacToeContext = () => {
  const context = useContext(TicTacToeContext);
  if (!context) {
    throw new Error("useGameContext must be used within a GameProvider");
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
  const [history, setHistory] = useState<BoardValue[]>([Array(9).fill(null)]);
  const [players, setPlayers] = useState<Record<number, string | null>>({
    1: null,
    2: null,
  });
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

  // Get username
  const { username, setUsername, clearUsername } = useUserContext();

  useEffect(() => {
    let isMounted = true;

    const connectWebSocket = async () => {
      try {
        const webSocket = await getGameWebsocket(gameID);

        if (username) {
          setPlayerNameWebsocket(username, webSocket);
        }

        setIsLoading(false);

        if (!isMounted) return; // handle fast unmount

        gameWebSocket.current = webSocket;
        webSocket.addEventListener("message", (event) => {
          try {
            const parsedMessage = parseWebSocketMessage(event);

            switch (parsedMessage.message_type) {
              case "session_state":
                setCurrentUserPosition(parsedMessage.parameters.user_position);
                setPlayers(parsedMessage.parameters.player_positions);
                break;

              case "error":
                addToast({
                  title: "Error",
                  description: parsedMessage.parameters.error_message,
                  color: "danger",
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
                setHistory(gameState.history);
                setWinningLine(gameState.winning_line);
                setWinner(gameState.winner);
                // TODO: Would be nice if this didn't jump if they are looking at the history.
                // Current issue is we don't want dependencies for this effect on the game state.
                setCurrentViewedMove(gameState.history.length - 1);
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
  }, [gameID, username]);

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

  const currentMove = useMemo(() => history.length - 1, [history]);

  const currentPlayerNumber = useMemo(() => {
    return currentMove % 2;
  }, [currentMove]);
  const currentPlayer = useMemo(() => {
    return players[currentPlayerNumber];
  }, [currentPlayerNumber, players]);

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
    if (winner) return;
    if (history[currentMove][position]) return;
    if (currentUserPosition !== currentPlayerNumber) return;
    if (currentViewedMove !== currentMove) return;
    if (!username) return;
    makeMoveOverWebsocket(gameWebSocket.current, position);
  };

  // Provide tsx
  if (isLoading) return <div>Loading game... </div>;

  return (
    <TicTacToeContext.Provider
      value={{
        history,
        players,
        currentMove,
        currentPlayer,
        winner,
        winningLine,
        currentUserPosition,
        currentViewedMove,
        setCurrentViewedMove,
        updateCurrentUserPosition,
        makeMove,
      }}
    >
      {children}
    </TicTacToeContext.Provider>
  );
}

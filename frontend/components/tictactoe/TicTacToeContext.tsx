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
  addAIPlayerOverWebsocket,
  removeAIPlayerOverWebsocket,
} from "@/lib/websocketFunctions";
import { addToast } from "@heroui/react";
import { usePathname } from "next/navigation";
import { useGameContext } from "@/context/GameContext";
import { getUserName } from "@/context/UserContext";
import { getGameModels } from "@/lib/apiCalls";

type TicTacToeBoardContextType = {
  history: BoardValue[];
  currentMove: number;
  winningLine: number[];
  currentViewedMove: number;
  makeMove: (position: number) => void;
};

type TicTacToeGameContextType = {
  players: Record<number, string | null>;
  currentMove: number;
  currentPlayer: string | null;
  winner: number | null;
  currentViewedMove: number;
  setCurrentViewedMove: (newMove: number) => void;
};

type TicTacToePlayerContextType = {
  players: Record<number, string | null>;
  aiPlayers: Record<number, string>;
  currentUserPosition: number | null;
  aiModels: Record<string, string>;
  updateCurrentUserPosition: (newPosition: number | null) => Promise<void>;
  removeAIPlayer: (position: number) => Promise<void>;
  addAIPlayer: (position: number, model: string) => Promise<void>;
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
  const [history, setHistory] = useState<BoardValue[]>([Array(9).fill(null)]);
  const [players, setPlayers] = useState<Record<number, string | null>>({
    1: null,
    2: null,
  });
  const [aiModels, setAIModels] = useState<Record<string, string>>({});
  const [aiPlayers, setAIPlayers] = useState<Record<number, string>>({});
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

  const username = getUserName();

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

              case "ai_players":
                setAIPlayers(parsedMessage.parameters.ai_players);
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

  // Get AI models
  useEffect(() => {
    const fetchAIModels = async () => {
      try {
        const models = await getGameModels(gameID);
        setAIModels(models);
      } catch (error) {
        console.error("Failed to fetch AI models:", error);
      }
    };
    fetchAIModels();
  }, [gameID]);

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
    if (winner) return;
    if (history[currentMove][position]) return;
    if (currentUserPosition !== currentPlayerNumber) return;
    if (currentViewedMove !== currentMove) return;
    if (!username) return;
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
        history,
        currentMove,
        winningLine,
        currentViewedMove,
        makeMove,
      }}
    >
      <TicTacToePlayerContext.Provider
        value={{
          players,
          aiPlayers,
          currentUserPosition,
          aiModels,
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

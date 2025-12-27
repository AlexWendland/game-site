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
import {
  addAIPlayerOverWebsocket,
  getGameWebsocket,
  leavePlayerPosition,
  parseWebSocketMessage,
  removeAIPlayerOverWebsocket,
  setPlayerNameWebsocket,
  setPlayerPosition,
} from "@/lib/websocketFunctions";
import { useToast } from "@/context/ToastContext";
import { usePathname } from "next/navigation";
import { useGameContext } from "@/context/GameContext";
import { useAuth } from "@/context/AuthContext";
import { BoardValue } from "@/types/gameTypes";
import { getGameModels } from "@/lib/apiCalls";

type UltimatePlayerContextType = {
  players: Record<number, string | null>;
  aiPlayers: Record<number, string>;
  currentUserPosition: number | null;
  aiModels: Record<string, string>;
  currentPlayerNumber: number | null;
  updateCurrentUserPosition: (newPosition: number | null) => Promise<void>;
  removeAIPlayer: (position: number) => Promise<void>;
  addAIPlayer: (position: number, model: string) => Promise<void>;
};

type UltimateHistoryContextType = {
  players: Record<number, string | null>;
  currentPlayer: null | string;
  winner: number | null;
  currentMove: number;
  currentViewedMove: number;
  setCurrentViewedMove: (newMove: number) => void;
};

type UltimateSectorContextType = {
  sectorsOwned: BoardValue;
  winningSectorLine: number[];
  currentMove: number;
  currentViewedMove: number;
};

type UltimateSectorBoardContextType = {
  moves: BoardValue;
  sectorToPlayIn: BoardValue;
  currentMove: number;
  currentViewedMove: number;
  winner: number | null;
  isCurrentUsersGo: boolean;
  currentPlayerNumber: number | null;
  makeMove: (position: number) => void;
};

type UltimateGameState = {
  moves: BoardValue;
  sector_to_play: BoardValue;
  sectors_owned: BoardValue;
  winner: number | null;
  winning_line: number[];
};

function parseGameState(
  parameters: Record<string, any>,
): UltimateGameState | null {
  if (
    typeof (parameters as any).moves !== "object" ||
    typeof (parameters as any).sector_to_play !== "object" ||
    typeof (parameters as any).sectors_owned !== "object" ||
    !("winner" in parameters) ||
    typeof (parameters as any).winning_line !== "object"
  ) {
    console.log("Invalid game state format:", parameters);
    throw new Error("Invalid structure");
  }
  return parameters as UltimateGameState;
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

const UltimatePlayerContext = createContext<UltimatePlayerContextType | null>(
  null,
);
const UltimateHistoryContext = createContext<UltimateHistoryContextType | null>(
  null,
);
const UltimateSectorContext = createContext<UltimateSectorContextType | null>(
  null,
);
const UltimateSectorBoardContext =
  createContext<UltimateSectorBoardContextType | null>(null);

export const useUltimatePlayerContext = () => {
  const context = useContext(UltimatePlayerContext);
  if (!context) {
    throw new Error(
      "useUltimatePlayerContext must be used within a UltimateProvider",
    );
  }
  return context;
};

export const useUltimateHistoryContext = () => {
  const context = useContext(UltimateHistoryContext);
  if (!context) {
    throw new Error(
      "useUltimateHistoryContext must be used within a UltimateProvider",
    );
  }
  return context;
};

export const useUltimateSectorContext = () => {
  const context = useContext(UltimateSectorContext);
  if (!context) {
    throw new Error(
      "useUltimateSectorContext must be used within a UltimateProvider",
    );
  }
  return context;
};

export const useUltimateSectorBoardContext = () => {
  const context = useContext(UltimateSectorBoardContext);
  if (!context) {
    throw new Error(
      "useUltimateSectorContext must be used within a UltimateProvider",
    );
  }
  return context;
};

export function UltimateProvider({
  gameID,
  children,
}: {
  gameID: string;
  children: ReactNode;
}) {
  // Backend state
  const [moves, setMoves] = useState<BoardValue>(Array(81).fill(null));
  const [players, setPlayers] = useState<Record<number, string | null>>({
    1: null,
    2: null,
  });
  const [sectorsOwned, setSectorsOwned] = useState<BoardValue>(
    Array(9).fill(null),
  );
  const [sectorToPlayIn, setSectorToPlayIn] = useState<BoardValue>([null]);
  const [winner, setWinner] = useState<number | null>(null);
  const [winningSectorLine, setWinningSectorLine] = useState<number[]>([]);
  // Client state
  const [currentUserPosition, setCurrentUserPosition] = useState<number | null>(
    null,
  );
  const [currentViewedMove, setCurrentViewedMove] = useState(0);
  // Initial loading of state
  const [isLoading, setIsLoading] = useState(true);
  // Websocket
  const gameWebSocket = useRef<WebSocket | null>(null);
  const [aiModels, setAIModels] = useState<Record<string, string>>({});
  const [aiPlayers, setAIPlayers] = useState<Record<number, string>>({});

  const { addToast } = useToast();

  const { getUsername } = useAuth();
  const username = getUsername();

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
                  type: "error",
                  message: parsedMessage.parameters.error_message,
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
                setMoves(gameState.moves);
                setSectorToPlayIn(gameState.sector_to_play);
                setSectorsOwned(gameState.sectors_owned);
                setWinningSectorLine(gameState.winning_line);
                setWinner(gameState.winner);
                // TODO: Would be nice if this didn't jump if they are looking at the history.
                // Current issue is we don't want dependencies for this effect on the game state.
                setCurrentViewedMove(gameState.sector_to_play.length - 1);
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

  // Define meta parameters

  const currentMove = useMemo(
    () => sectorToPlayIn.length - 1,
    [sectorToPlayIn],
  );

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
    if (winner !== null || currentMove === 81) {
      // TODO: Work out how to determine if it is a draw.
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
    if (moves[position] !== null) return;
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
    <UltimatePlayerContext.Provider
      value={{
        players,
        aiPlayers,
        currentUserPosition,
        aiModels,
        currentPlayerNumber: winner === null ? currentPlayerNumber : null,
        updateCurrentUserPosition,
        addAIPlayer,
        removeAIPlayer,
      }}
    >
      <UltimateHistoryContext.Provider
        value={{
          players,
          currentPlayer,
          winner,
          currentMove,
          currentViewedMove,
          setCurrentViewedMove,
        }}
      >
        <UltimateSectorContext.Provider
          value={{
            sectorsOwned,
            winningSectorLine,
            currentMove,
            currentViewedMove,
          }}
        >
          <UltimateSectorBoardContext.Provider
            value={{
              moves,
              sectorToPlayIn,
              currentMove,
              currentViewedMove,
              winner,
              isCurrentUsersGo,
              currentPlayerNumber: winner === null ? currentPlayerNumber : null,
              makeMove,
            }}
          >
            {children}
          </UltimateSectorBoardContext.Provider>
        </UltimateSectorContext.Provider>
      </UltimateHistoryContext.Provider>
    </UltimatePlayerContext.Provider>
  );
}

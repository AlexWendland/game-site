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
import { getGameMetadata, getGameModels } from "@/lib/apiCalls";
import {
  Geometry,
  GravitySetting,
  TopologicalGameMetadata,
} from "@/types/apiTypes";

type TopologicalBoardContextType = {
  boardSize: number;
  moves: (number | null)[][];
  maxPlayers: number;
  winningLine: [number, number][];
  currentViewedMove: number;
  availableMoves: [number, number][];
  makeMove: (row: number, column: number) => void;
};

type TopologicalGameContextType = {
  boardSize: number;
  players: Record<number, string | null>;
  currentMove: number;
  currentPlayer: string | null;
  winner: number | null;
  currentViewedMove: number;
  setCurrentViewedMove: (newMove: number) => void;
};

type TopologicalPlayerContextType = {
  players: Record<number, string | null>;
  maxPlayers: number;
  aiPlayers: Record<number, string>;
  currentUserPosition: number | null;
  aiModels: Record<string, string>;
  updateCurrentUserPosition: (newPosition: number | null) => Promise<void>;
  removeAIPlayer: (position: number) => Promise<void>;
  addAIPlayer: (position: number, model: string) => Promise<void>;
};

type TopologicalGameState = {
  moves: (number | null)[][];
  winner: number | null;
  winning_line: [number, number][];
  available_moves: [number, number][];
  current_move: number;
};

export function parseGameState(
  parameters: Record<string, any>,
): TopologicalGameState {
  const { moves, winner, winning_line, available_moves, current_move } =
    parameters;

  if (
    !Array.isArray(moves) ||
    !Array.isArray(winning_line) ||
    !Array.isArray(available_moves) ||
    (winner !== null && typeof winner !== "number") ||
    typeof current_move !== "number"
  ) {
    console.error("Invalid game state structure:", parameters);
    throw new Error("Invalid structure");
  }

  if (
    !moves.every(
      (row: any) =>
        Array.isArray(row) &&
        row.every((cell) => typeof cell === "number" || cell === null),
    )
  ) {
    throw new Error("Invalid format for moves");
  }

  const isTupleOfTwoNumbers = (pair: any) =>
    Array.isArray(pair) &&
    pair.length === 2 &&
    typeof pair[0] === "number" &&
    typeof pair[1] === "number";

  if (
    !winning_line.every(isTupleOfTwoNumbers) ||
    !available_moves.every(isTupleOfTwoNumbers)
  ) {
    throw new Error("Invalid format for coordinate lists");
  }

  return {
    moves,
    winner,
    winning_line,
    available_moves,
    current_move,
  };
}

export function makeMoveOverWebsocket(
  webSocket: WebSocket | null,
  row: number,
  column: number,
): void {
  if (!webSocket) {
    return;
  }
  webSocket.send(
    JSON.stringify({
      request_type: "game",
      function_name: "make_move",
      parameters: {
        row: row,
        column: column,
      },
    }),
  );
}

const TopologicalBoardContext =
  createContext<TopologicalBoardContextType | null>(null);
const TopologicalPlayerContext =
  createContext<TopologicalPlayerContextType | null>(null);
const TopologicalGameContext = createContext<TopologicalGameContextType | null>(
  null,
);

export const useTopologicalBoardContext = () => {
  const context = useContext(TopologicalBoardContext);
  if (!context) {
    throw new Error(
      "useTopologicalBoardContext must be used within a TopologicalProvider",
    );
  }
  return context;
};

export const useTopologicalPlayerContext = () => {
  const context = useContext(TopologicalPlayerContext);
  if (!context) {
    throw new Error(
      "useTopologicalPlayerContext must be used within a TopologicalProvider",
    );
  }
  return context;
};

export const useTopologicalGameContext = () => {
  const context = useContext(TopologicalGameContext);
  if (!context) {
    throw new Error(
      "useTopologicalGameContext must be used within a TopologicalProvider",
    );
  }
  return context;
};

export function TopologicalProvider({
  gameID,
  children,
}: {
  gameID: string;
  children: ReactNode;
}) {
  // Backend state
  const [moves, setMoves] = useState<(number | null)[][]>([]);
  const [currentMove, setCurrentMove] = useState(0);
  const [availableMoves, setAvailableMoves] = useState<[number, number][]>([]);
  const [players, setPlayers] = useState<Record<number, string | null>>({});
  const [aiModels, setAIModels] = useState<Record<string, string>>({});
  const [aiPlayers, setAIPlayers] = useState<Record<number, string>>({});
  const [winner, setWinner] = useState<number | null>(null);
  const [winningLine, setWinningLine] = useState<[number, number][]>([]);
  // Client state
  const [currentUserPosition, setCurrentUserPosition] = useState<number | null>(
    null,
  );
  const [currentViewedMove, setCurrentViewedMove] = useState(0);
  const [geometry, setGeometry] = useState<Geometry>(Geometry.NO_GEOMETRY);
  const [gravity, setGravity] = useState<GravitySetting>(GravitySetting.NONE);
  const [boardSize, setBoardSize] = useState(8);
  const [maxPlayers, setMaxPlayers] = useState(2);
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
                setMoves(gameState.moves);
                setAvailableMoves(gameState.available_moves);
                setWinningLine(gameState.winning_line);
                setWinner(gameState.winner);
                setCurrentMove(gameState.current_move);
                // TODO: Would be nice if this didn't jump if they are looking at the history.
                // Current issue is we don't want dependencies for this effect on the game state.
                setCurrentViewedMove(gameState.current_move);
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

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const metadata = (await getGameMetadata(
          gameID,
        )) as TopologicalGameMetadata;
        console.log("Game metadata:", metadata);
        setGeometry(metadata.parameters.geometry);
        setGravity(metadata.parameters.gravity);
        setBoardSize(metadata.parameters.board_size);
        setMaxPlayers(metadata.max_players);
      } catch (error) {
        console.error("Failed to fetch AI models:", error);
      }
    };
    fetchMetadata();
  }, [gameID]);

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

  const currentPlayerNumber = useMemo(() => {
    return currentMove % maxPlayers;
  }, [currentMove, maxPlayers]);
  const currentPlayer = useMemo(() => {
    return players[currentPlayerNumber];
  }, [currentPlayerNumber, players]);

  useEffect(() => {
    if (winner !== null || availableMoves.length === 0) {
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

  const makeMove = async (row: number, column: number) => {
    if (winner) return;
    if (moves[row][column]) return;
    if (currentUserPosition !== currentPlayerNumber) return;
    if (currentViewedMove !== currentMove) return;
    if (!username) return;
    makeMoveOverWebsocket(gameWebSocket.current, row, column);
  };

  const removeAIPlayer = async (position: number) => {
    removeAIPlayerOverWebsocket(gameWebSocket.current, position);
  };

  const addAIPlayer = async (position: number, model: string) => {
    addAIPlayerOverWebsocket(gameWebSocket.current, position, model);
  };

  if (isLoading) return <div>Loading game... </div>;

  return (
    <TopologicalBoardContext.Provider
      value={{
        boardSize,
        moves,
        maxPlayers,
        availableMoves,
        winningLine,
        currentViewedMove,
        makeMove,
      }}
    >
      <TopologicalPlayerContext.Provider
        value={{
          players,
          maxPlayers,
          aiPlayers,
          currentUserPosition,
          aiModels,
          updateCurrentUserPosition,
          addAIPlayer,
          removeAIPlayer,
        }}
      >
        <TopologicalGameContext.Provider
          value={{
            boardSize,
            players,
            currentMove,
            currentPlayer,
            winner,
            currentViewedMove,
            setCurrentViewedMove,
          }}
        >
          {children}
        </TopologicalGameContext.Provider>
      </TopologicalPlayerContext.Provider>
    </TopologicalBoardContext.Provider>
  );
}

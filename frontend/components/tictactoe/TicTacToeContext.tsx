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
import { getGameStateAPI, makeMoveAPI } from "@/lib/apiCalls";
import {
  getGameWebsocket,
  leavePlayerPosition,
  parseWebSocketMessage,
  setPlayerNameWebsocket,
  setPlayerPosition,
} from "@/lib/websocketFunctions";
import { calculateWinner } from "@/lib/gameFunctions";
import { addToast } from "@heroui/react";
import { usePathname } from "next/navigation";
import { useGameContext } from "@/context/GameContext";
import { useUserContext } from "@/context/UserContext";

type TicTacToeContextType = {
  // Backend state
  history: BoardValue[];
  players: Record<number, string | null>;
  // Metadata on state
  currentMove: number;
  currentPlayer: string | null;
  winner: SquareValue;
  winningLine: number[];
  // Client state
  currentUserPosition: number | null;
  currentViewedMove: number;
  // Functions
  setCurrentViewedMove: (newMove: number) => void;
  updateCurrentUserPosition: (newPosition: number | null) => Promise<void>;
  makeMove: (position: number) => void;
};

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

        if (!isMounted) return; // handle fast unmount

        gameWebSocket.current = webSocket;
        webSocket.addEventListener("message", (event) => {
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

            case "game_state":
              // Do something with parsedMessage.parameters
              break;

            case "unknown":
            default:
              console.warn("Unknown message type:", parsedMessage);
              break;
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
    console.log(pathname);
    return () => {
      clearGame();
    };
  }, [gameID]);

  async function loadTicTacToeState() {
    try {
      const gameState = await getGameStateAPI(gameID);
      const changeMove = currentViewedMove === currentMove;
      setHistory(gameState.board_history);
      setPlayers(gameState.players);
      if (changeMove) {
        setCurrentViewedMove(gameState.board_history.length - 1);
      }
    } catch (err) {
      console.error("Error loading game data:", err);
    } finally {
      setIsLoading(false);
    }
  }

  // Define meta parameters

  const currentMove = useMemo(() => history.length - 1, [history]);

  const winner = useMemo(() => {
    const result = calculateWinner(history[currentMove]);
    return result ? result.winner : null;
  }, [history, currentMove]);
  const winningLine = useMemo(() => {
    const result = calculateWinner(history[currentMove]);
    return result ? result.line : [];
  }, [history, currentMove]);
  const currentPlayerNumber = useMemo(() => {
    return (currentMove % 2) + 1;
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
    await makeMoveAPI(gameID, currentUserPosition, username, position);
    await loadTicTacToeState();
    setCurrentViewedMove(currentMove + 1);
  };

  useEffect(() => {
    loadTicTacToeState();
    return () => {};
  }, [currentMove, currentViewedMove]);

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

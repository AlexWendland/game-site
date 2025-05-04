"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  ReactNode,
} from "react";
import { BoardValue, SquareValue } from "@/types/gameTypes";
import {
  getGameStateAPI,
  makeMoveAPI,
  setPlayerAPI,
  unsetPlayerAPI,
} from "@/lib/apiCalls";
import { calculateWinner } from "@/lib/gameFunctions";
import { addToast } from "@heroui/react";

type GameContextType = {
  // Backend state
  history: BoardValue[];
  players: Record<number, string | null>;
  // Metadata on state
  currentMove: number;
  currentPlayer: string | null;
  winner: SquareValue;
  winningLine: number[];
  // Client state
  currentUserName: string | null;
  currentUserPosition: number;
  currentViewedMove: number;
  // Functions
  setCurrentViewedMove: (newMove: number) => void;
  updateCurrentUserName: (newUser: string | null) => Promise<void>;
  updateCurrentUserPosition: (newPosition: number) => Promise<void>;
  makeMove: (position: number) => void;
};

const GameContext = createContext<GameContextType | null>(null);

export const useGameContext = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error("useGameContext must be used within a GameProvider");
  }
  return context;
};

export function GameProvider({
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
  const [currentUserName, setCurrentUserName] = useState("");
  const [currentUserPosition, setCurrentUserPosition] = useState(0);
  const [currentViewedMove, setCurrentViewedMove] = useState(0);
  // Initial loading of state
  const [isLoading, setIsLoading] = useState(true);

  async function loadGameState() {
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

  const updateCurrentUserName = async (newUser: string | null) => {
    if (!newUser) {
      if (currentUserPosition !== 0) {
        unsetPlayerAPI(gameID, currentUserPosition, currentUserName);
      }
    } else if (currentUserPosition !== 0) {
      unsetPlayerAPI(gameID, currentUserPosition, currentUserName);
      setPlayerAPI(gameID, currentUserPosition, newUser);
    }
    setCurrentUserName(newUser || "");
    await loadGameState();
  };

  const updateCurrentUserPosition = async (newPosition: number) => {
    if (currentUserPosition !== 0) {
      unsetPlayerAPI(gameID, currentUserPosition, currentUserName);
      setCurrentUserPosition(0);
    }
    if (newPosition !== currentUserPosition) {
      try {
        await setPlayerAPI(gameID, newPosition, currentUserName);
        setCurrentUserPosition(newPosition);
      } catch (err: unknown) {
        console.error("Error setting player:", err);
        const message = err instanceof Error ? err.message : String(err);
        addToast({
          title: "Error",
          description: message,
        });
      }
    }
    await loadGameState();
  };

  const makeMove = async (position: number) => {
    if (winner) return;
    if (history[currentMove][position]) return;
    if (currentUserPosition !== currentPlayerNumber) return;
    if (currentViewedMove !== currentMove) return;
    await makeMoveAPI(gameID, currentUserPosition, currentUserName, position);
    await loadGameState();
    setCurrentViewedMove(currentMove + 1);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      loadGameState();
    }, 1000); // every 5 seconds

    return () => clearInterval(interval); // cleanup on unmount
  }, [currentMove, currentViewedMove]);

  // Provide tsx
  if (isLoading) return <div>Loading game... </div>;

  return (
    <GameContext.Provider
      value={{
        history,
        players,
        currentMove,
        currentPlayer,
        winner,
        winningLine,
        currentUserName,
        currentUserPosition,
        currentViewedMove,
        setCurrentViewedMove,
        updateCurrentUserName,
        updateCurrentUserPosition,
        makeMove,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

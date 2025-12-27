import { createContext, useContext, useState, ReactNode } from "react";

type GameContextType = {
  gameCode: string | null;
  setGameCode: (name: string) => void;
  gameLink: string | null;
  setGameLink: (name: string) => void;
  gameState: string | null;
  setGameState: (name: string) => void;
  clearGame: () => void;
};

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider = ({ children }: { children: ReactNode }) => {
  const [gameCode, setGameCode] = useState<string | null>(null);
  const [gameLink, setGameLink] = useState<string | null>(null);
  const [gameState, setGameState] = useState<string | null>(null);

  const clearGame = () => {
    setGameCode(null);
    setGameLink(null);
    setGameState(null);
  };

  return (
    <GameContext.Provider
      value={{
        gameCode,
        setGameCode,
        gameLink,
        setGameLink,
        gameState,
        setGameState,
        clearGame,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useGameContext = (): GameContextType => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error("useGameContext must be used within a GameProvider");
  }
  return context;
};

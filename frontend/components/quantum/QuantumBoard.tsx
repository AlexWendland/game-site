import { ReactNode, createContext, useContext } from "react";
import { QuantumPlayerCard } from "@/components/quantum/QuantumPlayerCard";
import { QuantumGameLog } from "@/components/quantum/QuantumGameLog";
import { useQuantumContext, QuantumGameStateData } from "./QuantumContext";

// Context for player selection communication between Board and ActionSpace
type PlayerSelectionContextType = {
  selectedTargetPlayer: number | null;
  setSelectedTargetPlayer: (player: number | null) => void;
};

const PlayerSelectionContext = createContext<PlayerSelectionContextType | null>(
  null,
);

export const usePlayerSelection = () => {
  const context = useContext(PlayerSelectionContext);
  if (!context) {
    throw new Error(
      "usePlayerSelection must be used within a PlayerSelectionProvider",
    );
  }
  return context;
};

export function PlayerSelectionProvider({
  children,
  selectedTargetPlayer,
  setSelectedTargetPlayer,
}: {
  children: ReactNode;
  selectedTargetPlayer: number | null;
  setSelectedTargetPlayer: (player: number | null) => void;
}) {
  return (
    <PlayerSelectionContext.Provider
      value={{ selectedTargetPlayer, setSelectedTargetPlayer }}
    >
      {children}
    </PlayerSelectionContext.Provider>
  );
}

// Map number of players to card positions around the perimeter (clockwise arrangement)
// Grid positions for 3x4 layout:
//  0  1  2
//  3  4  5
//  6  7  8
//  9 10 11
const numberOfPlayersToCardPositions: Map<number, number[]> = new Map([
  [3, [10, 3, 5]], // You (bottom center), Player 1 (left), Player 2 (right)
  [4, [10, 3, 1, 5]], // You (bottom center), Player 1 (mid-left), Player 2 (top-center), Player 3 (right)
  [5, [10, 6, 3, 5, 8]], // You (bottom center), Player 1 (mid-left), Player 2 (left), Player 3 (right), Player 4 (mid-right)
  [6, [10, 6, 3, 1, 5, 8]], // You (bottom center), Player 1 (mid-left), Player 2 (left), Player 3 (top center), Player 4 (right), Player 5 (mid-right)
  [7, [10, 6, 3, 0, 2, 5, 8]], // You (bottom center), Player 1 (mid-left), Player 2 (left), Player 3 (top-left), Player 4 (top-right), Player 5 (right), Player 6 (mid-right)
  [8, [10, 6, 3, 0, 1, 2, 5, 8]], // You (bottom center), Player 1 (mid-left), Player 2 (left), Player 3 (top-left), Player 4 (top center), Player 5 (top-right), Player 6 (right), Player 7 (mid-right)
]);

function mapCardPositionToPlayer(
  cardPosition: number,
  numberOfPlayers: number,
  viewingPlayer: number | null,
): number | null {
  const mappedViewingPlayer = viewingPlayer ?? 0;
  const validPositions = numberOfPlayersToCardPositions.get(numberOfPlayers);

  if (!validPositions?.includes(cardPosition)) {
    return null;
  }

  // Position 0 is always the viewing player (bottom center)
  if (cardPosition === 0) {
    return mappedViewingPlayer;
  }

  // Map other positions clockwise starting from the viewing player
  // Players are arranged: You (bottom), then clockwise starting from left
  const positionIndex = validPositions.indexOf(cardPosition);
  return (mappedViewingPlayer + positionIndex) % numberOfPlayers;
}

// Presenter component
type QuantumBoardPresenterProps = {
  gameState: QuantumGameStateData | null;
  players: Record<number, string | null>;
  aiPlayers: Record<number, string>;
  currentUserPosition: number | null;
  aiModels: Record<string, string>;
  maxPlayers: number;
  onMovePlayer: (position: number) => void;
  onRemovePlayer: () => void;
  onAddAIPlayer: (position: number, model: string) => void;
  onRemoveAIPlayer: (position: number) => void;
  onPlayerClick?: (playerNumber: number) => void;
};

export function QuantumBoardPresenter({
  gameState,
  players,
  aiPlayers,
  currentUserPosition,
  aiModels,
  maxPlayers,
  onMovePlayer,
  onRemovePlayer,
  onAddAIPlayer,
  onRemoveAIPlayer,
  onPlayerClick,
}: QuantumBoardPresenterProps) {
  // Board layout (3x4 grid with current player at bottom center, others clockwise):
  // +-----------------+-----------------+-----------------+
  // | Player 3        | Player 4        | Player 5        |
  // | (Top-left)      | (Top center)    | (Top-right)     |
  // +-----------------+-----------------+-----------------+
  // | Player 2        |                 | Player 6        |
  // | (Left)          |   GAME LOG      | (Right)         |
  // +-----------------+   (spans 2      +-----------------+
  // | Player 1        |    rows)        | Player 7        |
  // | (Bottom-left)   |                 | (Bottom-right)  |
  // +-----------------+-----------------+-----------------+
  // |                 | Player 0        |                 |
  // |                 | (You/Current)   |                 |
  // +-----------------+-----------------+-----------------+

  function getPlayerCard(cardPosition: number): ReactNode {
    const player = mapCardPositionToPlayer(
      cardPosition,
      maxPlayers,
      currentUserPosition,
    );

    if (player === null) {
      return <div />;
    }

    const isSelected = currentUserPosition === player;
    const isAI = player in aiPlayers;
    const isOccupied = players[player] !== null;
    const isActive = gameState?.current_player === player;
    const isViewingPlayerActive =
      gameState?.current_player === currentUserPosition;

    return (
      <QuantumPlayerCard
        playerNumber={player}
        playerName={players[player] ?? null}
        isActive={isActive}
        isViewingPlayerActive={isViewingPlayerActive}
        isCurrentUser={isSelected}
        isOccupiedByHuman={isOccupied && !isAI}
        isOccupiedByAI={isAI}
        aiModels={aiModels}
        playerHasJoined={currentUserPosition !== null}
        movePlayer={() => onMovePlayer(player)}
        removePlayer={onRemovePlayer}
        addAIPlayer={(model: string) => onAddAIPlayer(player, model)}
        removeAIPlayer={() => onRemoveAIPlayer(player)}
        gameState={gameState}
        onPlayerClick={onPlayerClick}
        showGuessEditor={currentUserPosition !== null && (isOccupied || isAI)}
      />
    );
  }

  return (
    <div className="grid grid-cols-3 grid-rows-4 gap-4 w-full justify-items-center items-center">
      {/* Top row - positions 0, 1, 2 */}
      <div className="col-start-1 row-start-1">{getPlayerCard(0)}</div>
      <div className="col-start-2 row-start-1">{getPlayerCard(1)}</div>
      <div className="col-start-3 row-start-1">{getPlayerCard(2)}</div>

      {/* Second row - positions 3, 4 (game log), 5 */}
      <div className="col-start-1 row-start-2">{getPlayerCard(3)}</div>
      <div className="col-start-2 row-start-2 row-span-2 flex items-center">
        <QuantumGameLog />
      </div>
      <div className="col-start-3 row-start-2">{getPlayerCard(5)}</div>

      {/* Third row - positions 6, (game log continues), 8 */}
      <div className="col-start-1 row-start-3">{getPlayerCard(6)}</div>
      <div className="col-start-3 row-start-3">{getPlayerCard(8)}</div>

      {/* Bottom row - positions 9, 10 (you), 11 */}
      <div className="col-start-2 row-start-4">{getPlayerCard(10)}</div>
    </div>
  );
}

// Container component
export function QuantumBoard({
  onPlayerClick,
}: {
  onPlayerClick?: (playerNumber: number) => void;
}) {
  const {
    gameState,
    players,
    aiPlayers,
    currentUserPosition,
    aiModels,
    maxPlayers,
    updateCurrentUserPosition,
    removeAIPlayer,
    addAIPlayer,
  } = useQuantumContext();

  return (
    <QuantumBoardPresenter
      gameState={gameState}
      players={players}
      aiPlayers={aiPlayers}
      currentUserPosition={currentUserPosition}
      aiModels={aiModels}
      maxPlayers={maxPlayers}
      onMovePlayer={updateCurrentUserPosition}
      onRemovePlayer={() => updateCurrentUserPosition(null)}
      onAddAIPlayer={addAIPlayer}
      onRemoveAIPlayer={removeAIPlayer}
      onPlayerClick={onPlayerClick}
    />
  );
}

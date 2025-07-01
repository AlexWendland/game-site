import { ReactNode } from "react";
import { QuantumPlayerCard } from "@/components/quantum/QuantumPlayerCard";
import { QuantumGameLog } from "@/components/quantum/QuantumGameLog";
import { useQuantumContext } from "./QuantumContext";

// Board layout (3x4 grid with current player at bottom center, others clockwise):
// +-----------------+-----------------+-----------------+
// | Position 0      | Position 1      | Position 2      |
// | (Top-left)      | (Top center)    | (Top-right)     |
// +-----------------+-----------------+-----------------+
// | Position 3      |                 | Position 5      |
// | (Left)          |   GAME LOG      | (Right)         |
// +-----------------+   (spans 2      +-----------------+
// | Position 6      |    rows)        | Position 8      |
// | (Bottom-left)   |                 | (Bottom-right)  |
// +-----------------+-----------------+-----------------+
// |                 | Position 10     |                 |
// |                 | (You/Current)   |                 |
// +-----------------+-----------------+-----------------+
const numberOfPlayersToCardPositions: Map<number, number[]> = new Map([
  [3, [10, 3, 5]], // You (bottom center), Player 1 (left), Player 2 (right)
  [4, [10, 3, 1, 5]], // You (bottom center), Player 1 (mid-left), Player 2 (top-center), Player 3 (right)
  [5, [10, 6, 3, 5, 8]], // You (bottom center), Player 1 (mid-left), Player 2 (left), Player 3 (right), Player 4 (mid-right)
  [6, [10, 6, 3, 1, 5, 8]], // You (bottom center), Player 1 (mid-left), Player 2 (left), Player 3 (top center), Player 4 (right), Player 5 (mid-right)
  [7, [10, 6, 3, 0, 2, 5, 8]], // You (bottom center), Player 1 (mid-left), Player 2 (left), Player 3 (top-left), Player 4 (top-right), Player 5 (right), Player 6 (mid-right)
  [8, [10, 6, 3, 0, 1, 2, 5, 8]], // You (bottom center), Player 1 (mid-left), Player 2 (left), Player 3 (top-left), Player 4 (top center), Player 5 (top-right), Player 6 (right), Player 7 (mid-right)
]);
const topRowPositions = [0, 1, 2];
const hasTopRowPositions: Map<number, boolean> = new Map();

numberOfPlayersToCardPositions.forEach((positions, numberOfPlayers) => {
  const hasTop = topRowPositions.some((top) => positions.includes(top));
  hasTopRowPositions.set(numberOfPlayers, hasTop);
});

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

  // Map other positions clockwise starting from the viewing player
  // Players are arranged: You (bottom), then clockwise starting from left
  const positionIndex = validPositions.indexOf(cardPosition);
  return (mappedViewingPlayer + positionIndex) % numberOfPlayers;
}

// Presenter component
type QuantumBoardPresenterProps = {
  getPlayerCard: (cardPosition: number) => ReactNode;
  getGameLog: () => ReactNode;
  hasTopRow: boolean;
};

export function QuantumBoardPresenter({
  getPlayerCard,
  getGameLog,
  hasTopRow,
}: QuantumBoardPresenterProps) {
  // Remove the top row if not needed
  const gridRows = hasTopRow ? "grid-rows-4" : "grid-rows-3";
  const secondRowStart = hasTopRow ? "row-start-2" : "row-start-1";
  const thirdRowStart = hasTopRow ? "row-start-3" : "row-start-2";
  const fourthRowStart = hasTopRow ? "row-start-4" : "row-start-3";

  return (
    <div
      className={`grid grid-cols-3 ${gridRows} gap-4 w-full justify-items-center items-center`}
    >
      {/* Top row - positions 0, 1, 2 */}
      {hasTopRow && (
        <>
          <div className="col-start-1 row-start-1">{getPlayerCard(0)}</div>
          <div className="col-start-2 row-start-1">{getPlayerCard(1)}</div>
          <div className="col-start-3 row-start-1">{getPlayerCard(2)}</div>
        </>
      )}

      {/* Second row - positions 3, 4 (game log), 5 */}
      <div className={`col-start-1 ${secondRowStart}`}>{getPlayerCard(3)}</div>
      <div
        className={`col-start-2 ${secondRowStart} row-span-2 flex items-center`}
      >
        {getGameLog()}
      </div>
      <div className={`col-start-3 ${secondRowStart}`}>{getPlayerCard(5)}</div>

      {/* Third row - positions 6, (game log continues), 8 */}
      <div className={`col-start-1 ${thirdRowStart}`}>{getPlayerCard(6)}</div>
      <div className={`col-start-3 ${thirdRowStart}`}>{getPlayerCard(8)}</div>

      {/* Bottom row - positions 10 (you) */}
      <div className={`col-start-2 ${fourthRowStart}`}>{getPlayerCard(10)}</div>
    </div>
  );
}

// Container component
export function QuantumBoard({
  setSelectedTargetPlayer,
}: {
  setSelectedTargetPlayer: (playerNumber: number) => void;
}) {
  const { gameState, players, aiPlayers, currentUserPosition, maxPlayers } =
    useQuantumContext();

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
        setSelectedTargetPlayer={setSelectedTargetPlayer}
      />
    );
  }

  function getGameLog(): ReactNode {
    return <QuantumGameLog />;
  }
  return (
    <QuantumBoardPresenter
      getPlayerCard={getPlayerCard}
      getGameLog={getGameLog}
      hasTopRow={hasTopRowPositions.get(maxPlayers) ?? true}
    />
  );
}

import { TopologicalSquare } from "@/components/topological/TopologicalSquare";
import { useTopologicalBoardContext } from "@/components/topological/TopologicalContext";

export function TopologicalBoard() {
  const {
    boardSize,
    moves,
    maxPlayers,
    winningLine,
    currentViewedMove,
    availableMoves,
    closeSquares,
    geometry,
    hoveredSquare,
    makeMove,
    setHoveredSquare,
  } = useTopologicalBoardContext();

  return (
    <div
      className="grid gap-2 max-w-[600px] aspect-square"
      style={{ gridTemplateColumns: `repeat(${boardSize}, minmax(0, 1fr))` }}
    >
      {moves.toReversed().map((row, rowIndexInverted) =>
        row.map((moveNumber, columnIndex) => {
          const rowIndex = boardSize - 1 - rowIndexInverted;

          const isAvailable = availableMoves.some(
            ([r, c]) => r === rowIndex && c === columnIndex,
          );
          const isWinning = winningLine.some(
            ([r, c]) => r === rowIndex && c === columnIndex,
          );
          const isClose = closeSquares.some(
            ([r, c]) => r === rowIndex && c === columnIndex,
          );
          const isHovered =
            hoveredSquare !== null &&
            hoveredSquare[0] === rowIndex &&
            hoveredSquare[1] === columnIndex;
          return (
            <TopologicalSquare
              key={`${rowIndex}-${columnIndex}`}
              player={moveNumber !== null ? moveNumber % maxPlayers : null}
              onSquareClick={() => makeMove(rowIndex, columnIndex)}
              onMouseEnter={() => {
                setHoveredSquare([rowIndex, columnIndex]);
              }}
              onMouseExit={() => {
                setHoveredSquare(null);
              }}
              isHighlighted={
                (isAvailable && winningLine.length === 0) || isWinning
              }
              isClose={isClose}
              isHovered={isHovered}
              isShadowed={false}
              disabled={winningLine.length > 0 || !isAvailable}
              isInCurrentView={
                moveNumber !== null ? moveNumber < currentViewedMove : false
              }
            />
          );
        }),
      )}
    </div>
  );
}

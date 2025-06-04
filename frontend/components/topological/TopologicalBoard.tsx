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
    makeMove,
  } = useTopologicalBoardContext();
  return (
    <div
      className={`grid grid-cols-${boardSize} gap-2 max-w-[600px] aspect-square`}
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
          return (
            <TopologicalSquare
              key={`${rowIndex}-${columnIndex}`}
              player={moveNumber !== null ? moveNumber % maxPlayers : null}
              onSquareClick={() => makeMove(rowIndex, columnIndex)}
              isHighlighted={
                (isAvailable && winningLine.length === 0) || isWinning
              }
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

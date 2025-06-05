import { TopologicalSquare } from "@/components/topological/TopologicalSquare";
import { useTopologicalBoardContext } from "@/components/topological/TopologicalContext";
import { useIsMobile } from "@/context/BrowserContext";
import { ReactNode, useState } from "react";
import { Geometry } from "@/types/apiTypes";

function ArrowButton({
  direction,
  onClick,
  hidden,
  disabled,
  boardSize,
}: {
  direction: "up" | "down" | "left" | "right";
  onClick: () => void;
  hidden: boolean;
  disabled: boolean;
  boardSize: number;
}) {
  // Arrow SVG paths
  const arrowSvgs = {
    up: "M14 12v5a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-5H8a1 1 0 0 1-.7-1.7l4-4a1 1 0 0 1 1.4 0l4 4A1 1 0 0 1 16 12h-2z",
    down: "M10 12V7a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5h2a1 1 0 0 1 .7 1.7l-4 4a1 1 0 0 1-1.4 0l-4-4A1 1 0 0 1 8 12h2z",
    left: "M12 10h5a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-5v2a1 1 0 0 1-1.7.7l-4-4a1 1 0 0 1 0-1.4l4-4A1 1 0 0 1 12 8v2z",
    right:
      "M12 14H7a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1h5V8a1 1 0 0 1 1.7-.7l4 4a1 1 0 0 1 0 1.4l-4 4A1 1 0 0 1 12 16v-2z",
  };

  const arrowGrid = {
    up: {
      gridColumn: `1 / span ${boardSize + 2}`,
      gridRow: "1",
    },
    down: {
      gridColumn: `1 / span ${boardSize + 2}`,
      gridRow: `${boardSize + 2}`,
    },
    left: {
      gridRow: `2 / span ${boardSize}`,
      gridColumn: "1",
    },
    right: {
      gridRow: `2 / span ${boardSize}`,
      gridColumn: `${boardSize + 2}`,
    },
  };

  return (
    <div
      className={`flex items-center justify-center ${hidden ? "invisible" : ""}`}
      style={arrowGrid[direction]}
    >
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={direction}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          className="w-8 sm:w-16 text-gray-700"
        >
          <path d={arrowSvgs[direction]} fill="currentColor" />
        </svg>
      </button>
    </div>
  );
}

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
    normaliseCoordinate,
  } = useTopologicalBoardContext();
  const [rowOffset, setRowOffset] = useState(0);
  const [columnOffset, setColumnOffset] = useState(0);

  const isMobile = useIsMobile();

  const showHorizontal = geometry !== Geometry.NO_GEOMETRY;
  const showVertical =
    geometry !== Geometry.NO_GEOMETRY &&
    geometry !== Geometry.BAND &&
    geometry !== Geometry.MOBIUS;

  function createBoardSquare(
    row: number,
    column: number,
    shadowed: boolean,
  ): ReactNode {
    if (moves.length === 0) return null; // Wait for moves to be loaded
    const moveNumber = moves[row][column];
    const isAvailable = availableMoves.some(
      ([r, c]) => r === row && c === column,
    );
    const isWinning = winningLine.some(([r, c]) => r === row && c === column);
    const isClose = closeSquares.some(([r, c]) => r === row && c === column);
    const isHovered =
      hoveredSquare !== null &&
      hoveredSquare[0] === row &&
      hoveredSquare[1] === column;
    return (
      <TopologicalSquare
        key={`${row}-${column}`}
        player={moveNumber !== null ? moveNumber % maxPlayers : null}
        onSquareClick={() => makeMove(row, column)}
        onMouseEnter={() => {
          if (!isMobile) setHoveredSquare([row, column]);
        }}
        onMouseExit={() => {
          if (!isMobile) setHoveredSquare(null);
        }}
        isHighlighted={(isAvailable && winningLine.length === 0) || isWinning}
        isClose={isClose}
        isHovered={isHovered}
        isShadowed={shadowed}
        disabled={winningLine.length > 0 || !isAvailable}
        isInCurrentView={
          moveNumber !== null ? moveNumber < currentViewedMove : false
        }
      />
    );
  }

  // Render board squares
  const boardSquares = Array.from({ length: boardSize }).flatMap(
    (_, rowLevelIdx) =>
      Array.from({ length: boardSize }).map((_, columnLevel) => {
        const rowLevel = boardSize - 1 - rowLevelIdx;
        const normalisedCoordinates = normaliseCoordinate(
          rowLevel + rowOffset,
          columnLevel + columnOffset,
        );
        if (normalisedCoordinates === null) return null;
        return (
          <div
            key={`cell-${rowLevel}-${columnLevel}`}
            className={`col-start-${columnLevel + 2} row-start-${rowLevelIdx + 2}`}
          >
            {createBoardSquare(
              normalisedCoordinates[0],
              normalisedCoordinates[1],
              false,
            )}
          </div>
        );
      }),
  );

  return (
    <div
      className="grid gap-1 sm:gap-2 max-w-[800px] aspect-square"
      style={{
        gridTemplateColumns: `repeat(${boardSize + 2}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${boardSize + 2}, minmax(0, 1fr))`,
      }}
    >
      <ArrowButton
        direction="up"
        onClick={() => setRowOffset(rowOffset + 1)}
        hidden={!showVertical}
        disabled={!showVertical}
        boardSize={boardSize}
      />
      <ArrowButton
        direction="down"
        onClick={() => setRowOffset(rowOffset - 1)}
        hidden={!showVertical}
        disabled={!showVertical}
        boardSize={boardSize}
      />
      <ArrowButton
        direction="left"
        onClick={() => setColumnOffset(columnOffset - 1)}
        hidden={!showHorizontal}
        disabled={!showHorizontal}
        boardSize={boardSize}
      />
      <ArrowButton
        direction="right"
        onClick={() => setColumnOffset(columnOffset + 1)}
        hidden={!showHorizontal}
        disabled={!showHorizontal}
        boardSize={boardSize}
      />
      {boardSquares}
    </div>
  );
}

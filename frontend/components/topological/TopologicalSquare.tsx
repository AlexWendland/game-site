import clsx from "clsx";
import { getPlayerIcon } from "./PlayerIconMap";

type SquareProps = {
  player: number | null;
  onSquareClick: () => void;
  onMouseEnter: () => void;
  onMouseExit: () => void;
  isHighlighted: boolean;
  isClose: boolean;
  isShadowed: boolean;
  isHovered: boolean;
  isInCurrentView: boolean;
  disabled: boolean;
};

export function TopologicalSquare({
  player,
  onSquareClick,
  onMouseEnter,
  onMouseExit,
  isHighlighted,
  isClose,
  isInCurrentView,
  isShadowed,
  isHovered,
  disabled,
}: SquareProps) {
  const classes = clsx(
    "flex items-center justify-center w-full aspect-square border border-gray-400",
    "select-none",
    "text-9xl",
    isHovered
      ? "bg-green-400"
      : isHighlighted && isClose
        ? "bg-green-200"
        : isHighlighted
          ? "bg-yellow-200 dark:bg-yellow-400"
          : isClose
            ? "bg-blue-200"
            : isShadowed
              ? "bg-gray-200"
              : "bg-gray-50",
  );

  return (
    <button
      disabled={disabled}
      onClick={onSquareClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseExit}
      className={classes}
    >
      {/* 
        There are 3 states,
          1. Empty with 0 opacity.
          2. Filled and visible will 100 opacity.
          3. Filled but not currently in view with 50 opacity.
        There are animated transitions between the states.
        There is also a filler O that is used to hold the shape of the board.
      */}
      <span
        className={clsx(
          "flex items-center justify-center w-full h-full transition-opacity duration-500",
          player !== null
            ? isInCurrentView
              ? "opacity-100"
              : "opacity-50"
            : "opacity-0",
        )}
      >
        {getPlayerIcon(player || 0)}
      </span>
    </button>
  );
}

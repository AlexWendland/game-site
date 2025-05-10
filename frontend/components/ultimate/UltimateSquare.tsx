import clsx from "clsx";

type SquareProps = {
  value: string | null;
  onSquareClick: () => void;
  isHighlighted: boolean;
  isInCurrentView: boolean;
};

export function UltimateSquare({
  value,
  onSquareClick,
  isHighlighted,
  isInCurrentView,
}: SquareProps) {
  const textColor =
    value === "X"
      ? "text-gray-900"
      : value === "O"
        ? "text-red-500"
        : "text-transparent";

  const textSize =
    value === "X" ? "text-[22px] sm:text-5xl" : "text-sm sm:text-4xl";

  const classes = clsx(
    "flex items-center justify-center",
    "w-[26px] h-[26px] sm:w-[50px] sm:h-[50px]",
    "select-none",
    "aspect-square",
    "border border-gray-400",
    isHighlighted ? "bg-yellow-100" : "bg-gray-50",
    "text-center",
    textSize,
    textColor,
  );

  return (
    <button onClick={onSquareClick} className={classes}>
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
          "transition-opacity duration-500",
          value
            ? isInCurrentView
              ? "opacity-100"
              : "opacity-50"
            : "opacity-0",
        )}
      >
        {value === "X" ? "✖️" : "⭕"}
      </span>
    </button>
  );
}

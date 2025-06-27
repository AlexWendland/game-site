import clsx from "clsx";

type SquareProps = {
  value: string | null;
  onSquareClick: () => void;
  isHighlighted: boolean;
  isInCurrentView: boolean;
  isCurrentUserGo: boolean;
  currentPlayerNumber?: number | null;
};

export function UltimateSquare({
  value,
  onSquareClick,
  isHighlighted,
  isInCurrentView,
  isCurrentUserGo,
  currentPlayerNumber,
}: SquareProps) {
  const classes = clsx(
    "flex items-center justify-center",
    "aspect-square",
    "border border-gray-400",
    {
      "bg-yellow-100 dark:bg-yellow-400": isHighlighted,
      "hover:bg-yellow-50 hover:dark:bg-yellow-300 hover:scale-105 transition-all":
        isHighlighted && isCurrentUserGo,
    },
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
          {
            "opacity-0": !value,
            "opacity-100": value && isInCurrentView,
            "opacity-50": value && !isInCurrentView,
            "animate-pulse": value && isInCurrentView && 
              ((value === "X" && currentPlayerNumber === 0) || 
               (value === "O" && currentPlayerNumber === 1)),
          }
        )}
      >
        {value === "X" ? (
          <img src="/cross.png" className="p-0.5" />
        ) : (
          <img src="/nought.png" className="p-0.5" />
        )}
      </span>
    </button>
  );
}

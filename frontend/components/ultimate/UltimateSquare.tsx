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
  const classes = clsx(
    "flex items-center justify-center",
    "aspect-square",
    "border border-gray-400",
    isHighlighted ? "bg-yellow-100" : "bg-gray-50",
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
        {value === "X" ? (
          <img src="/cross.svg" className="p-0.5" />
        ) : (
          <img src="/nought.svg" className="p-0.5" />
        )}
      </span>
    </button>
  );
}

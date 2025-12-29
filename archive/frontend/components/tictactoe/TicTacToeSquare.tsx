import clsx from "clsx";

type SquareProps = {
  value: string | null;
  onSquareClick: () => void;
  isHighlighted: boolean;
  isInCurrentView: boolean;
  isCurrentUsersGo: boolean;
  currentPlayerNumber?: number | null;
};

export function TicTacToeSquare({
  value,
  onSquareClick,
  isHighlighted,
  isInCurrentView,
  isCurrentUsersGo,
  currentPlayerNumber,
}: SquareProps) {
  const textColor =
    value === "X"
      ? "text-black-600"
      : value === "O"
        ? "text-red-500"
        : "text-transparent";

  const classes = clsx(
    "flex items-center justify-center w-full h-full border border-gray-400",
    "select-none",
    "text-9xl",
    textColor,
    {
      "bg-yellow-200 dark:bg-yellow-400": isHighlighted,
      "hover:bg-gray-100 hover:dark:bg-gray-700 hover:scale-105 transition-all":
        value === null && isCurrentUsersGo,
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
        className={clsx("transition-opacity duration-500", {
          "opacity-0": !value,
          "opacity-100": value && isInCurrentView,
          "opacity-50": value && !isInCurrentView,
          "animate-pulse":
            value &&
            isInCurrentView &&
            ((value === "X" && currentPlayerNumber === 0) ||
              (value === "O" && currentPlayerNumber === 1)),
        })}
      >
        {value === "X" ? (
          <img src="/cross.png" className="p-1" />
        ) : (
          <img src="/nought.png" className="p-1" />
        )}
      </span>
    </button>
  );
}

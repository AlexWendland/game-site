import { SquareValue } from "@/types/gameTypes";
import clsx from "clsx";

type SquareProps = {
  value: SquareValue;
  onSquareClick: () => void;
  isHighlighted?: boolean;
};

export function Square({
  value,
  onSquareClick,
  isHighlighted = false,
}: SquareProps) {
  const textColor =
    value === "X"
      ? "text-blue-600"
      : value === "O"
        ? "text-red-500"
        : "text-gray-700";

  const classes = clsx(
    "flex items-center justify-center w-full h-full border border-gray-400",
    "text-3xl font-bold transition-colors duration-300", // animate highlight
    "transition-transform active:scale-95", // press effect
    "select-none", // prevent accidental text selection
    textColor,
    isHighlighted ? "bg-yellow-200" : "bg-white",
  );

  return (
    <button onClick={onSquareClick} className={classes}>
      <span
        className={clsx(
          "transition-opacity duration-500",
          value ? "opacity-100" : "opacity-0",
        )}
      >
        {value}
      </span>
    </button>
  );
}

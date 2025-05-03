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
      ? "text-black-600"
      : value === "O"
        ? "text-red-500"
        : "text-transparent";

  const classes = clsx(
    "flex items-center justify-center w-full h-full border border-gray-400",
    "select-none",
    "text-9xl",
    textColor,
    isHighlighted ? "bg-yellow-200" : "bg-white",
  );

  return (
    <button onClick={onSquareClick} className={classes}>
      {/* This is used to animate the text */}
      <span
        className={clsx(
          "transition-opacity duration-500",
          value ? "opacity-100" : "opacity-0",
        )}
      >
        {/* Filler text is invisible until played */}
        {value ? value : "O"}
      </span>
    </button>
  );
}

import { SquareValue } from "@/types/gameTypes";

type SquareProps = {
  value: SquareValue;
  onSquareClick: () => void;
};

export function Square({ value, onSquareClick }: SquareProps) {
  return (
    <button className="square" onClick={onSquareClick}>
      {value}
    </button>
  );
}

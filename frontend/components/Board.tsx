import { Square } from "@/components/Square";
import { BoardValue } from "@/types/gameTypes";
import { calculateWinner } from "@/lib/gameFunctions";

type BoardProps = {
  xIsNext: boolean;
  squares: BoardValue;
  onPlay: (squares: BoardValue) => void;
};

export function Board({ xIsNext, squares, onPlay }: BoardProps) {
  const result = calculateWinner(squares);
  const winner = result?.winner ?? null;
  const winningLine = result?.line ?? [];

  function handleClick(i: number) {
    if (winner || squares[i]) {
      return;
    }
    const nextSquares: BoardValue = squares.slice();
    nextSquares[i] = xIsNext ? "X" : "O";
    onPlay(nextSquares);
  }

  const status = winner
    ? `Winner: ${winner}`
    : `Next player: ${xIsNext ? "X" : "O"}`;

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <div className="text-lg font-semibold">{status}</div>
      <div className="grid grid-cols-3 gap-1 w-full max-w-[300px] sm:max-w-[400px] md:max-w-[500px] aspect-square">
        {squares.map((val, i) => (
          <Square
            key={i}
            value={val}
            onSquareClick={() => handleClick(i)}
            isHighlighted={winningLine.includes(i)}
          />
        ))}
      </div>
    </div>
  );
}

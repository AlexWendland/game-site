import { Square } from "@/components/Square";
import { BoardValue } from "@/types/gameTypes";
import { calculateWinner } from "@/lib/gameFunctions";
import { addToast } from "@heroui/toast";

type BoardProps = {
  xIsNext: boolean;
  currentPlayer: number;
  squares: BoardValue;
  onPlay: (squares: BoardValue) => void;
};

export function NCBoard({
  xIsNext,
  currentPlayer,
  squares,
  onPlay,
}: BoardProps) {
  const result = calculateWinner(squares);
  const winner = result?.winner ?? null;
  const winningLine = result?.line ?? [];

  function handleClick(i: number) {
    if (winner || squares[i]) {
      return;
    }
    console.log(`Current player ${currentPlayer}`);
    console.log(`is x next: ${xIsNext}`);
    if (currentPlayer == 0) {
      // TODO: Add message about selecting a player.
      return;
    }
    if ((xIsNext && currentPlayer != 1) || (!xIsNext && currentPlayer != 2)) {
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
      <div className="grid grid-cols-3 gap-2 w-full sm:max-w-[400px] md:max-w-[500px] aspect-square">
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

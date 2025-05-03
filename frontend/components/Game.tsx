import { useState } from "react";
import { BoardValue } from "@/types/gameTypes";
import { Board } from "@/components/Board";

export function Game() {
  const [history, setHistory] = useState<BoardValue[]>([Array(9).fill(null)]);
  const [currentMove, setCurrentMove] = useState(0);
  const xIsNext = currentMove % 2 === 0;
  const currentSquares = history[currentMove];

  function handlePlay(nextSquares: BoardValue) {
    const nextHistory = [...history.slice(0, currentMove + 1), nextSquares];
    setHistory(nextHistory);
    setCurrentMove(nextHistory.length - 1);
  }

  function jumpTo(nextMove: number) {
    setCurrentMove(nextMove);
  }

  const moves = history.map((_, move) => {
    const description = move > 0 ? `Go to move #${move}` : "Go to game start";
    return (
      <li key={move}>
        <button
          onClick={() => jumpTo(move)}
          className="text-sm text-blue-600 hover:underline"
        >
          {description}
        </button>
      </li>
    );
  });

  return (
    <div className="flex flex-col md:flex-row gap-6 p-4 items-start">
      <div className="flex-shrink-0">
        <Board xIsNext={xIsNext} squares={currentSquares} onPlay={handlePlay} />
      </div>
      <div className="text-sm">
        <h2 className="font-semibold mb-2">History</h2>
        <ol className="space-y-1">{moves}</ol>
      </div>
    </div>
  );
}

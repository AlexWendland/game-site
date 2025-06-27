"use client";

import { TicTacToeBoard } from "@/components/tictactoe/TicTacToeBoard";
import { TicTacToePlayerPieces } from "@/components/tictactoe/TicTacToePlayerPieces";
import { Pagination } from "@/components/common/Pagination";
import { useTicTacToeGameContext } from "@/components/tictactoe/TicTacToeContext";

export function TicTacToeGame() {
  const {
    players,
    currentMove,
    currentPlayer,
    winner,
    currentViewedMove,
    setCurrentViewedMove,
  } = useTicTacToeGameContext();

  const status =
    winner !== null
      ? `Winner: ${players[winner] === null ? "Unassigned" : players[winner]}`
      : currentMove == 9
        ? "Draw"
        : `Next player: ${currentPlayer === null ? "Unassigned" : currentPlayer}`;

  return (
    <div>
      <div className="flex flex-col items-center gap-4 w-full h-full p-2">
        <div className="text-2xl font-bold">{status}</div>
        <TicTacToePlayerPieces>
          <TicTacToeBoard />
        </TicTacToePlayerPieces>
        <Pagination
          current={currentViewedMove + 1}
          min={1}
          max={currentMove + 1}
          onChange={(page) => {
            setCurrentViewedMove(page - 1);
          }}
        />
      </div>
    </div>
  );
}

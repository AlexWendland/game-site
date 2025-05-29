"use client";

import { TicTacToeBoard } from "@/components/tictactoe/TicTacToeBoard";
import { TicTacToePlayerBoard } from "@/components/tictactoe/TicTacToePlayerBoard";
import { Pagination } from "@heroui/react";
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
      <div className="grid grid-cols-1 justify-items-center gap-4 width-full p-2">
        <div className="text-2xl font-bold">{status}</div>
        <TicTacToePlayerBoard />
        <div className="hidden md:block"></div>
        <TicTacToeBoard />
        <Pagination
          variant="bordered"
          className="flex justify-center"
          page={currentViewedMove + 1}
          total={currentMove + 1}
          color="secondary"
          onChange={(page) => {
            setCurrentViewedMove(page - 1);
          }}
          showControls
        />
      </div>
    </div>
  );
}

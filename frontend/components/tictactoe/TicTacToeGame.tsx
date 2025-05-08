"use client";

import { TicTacToeBoard } from "@/components/tictactoe/TicTacToeBoard";
import { TicTacToePlayerBoard } from "@/components/tictactoe/TicTacToePlayerBoard";
import { Button, Pagination } from "@heroui/react";
import { useTicTacToeContext as useTicTacToeContext } from "@/components/tictactoe/TicTacToeContext";

export function TicTacToeGame() {
  const {
    history,
    players,
    currentMove,
    currentPlayer,
    winner,
    winningLine,
    currentUserPosition,
    currentViewedMove,
    setCurrentViewedMove,
    updateCurrentUserPosition,
    makeMove,
  } = useTicTacToeContext();

  return (
    <div>
      <div className="grid grid-cols-4 gap-4 width-full">
        <div className="col-span-1"></div>
        <div className="col-span-2 grid grid-cols-1">
          <TicTacToeBoard />
          <Pagination
            className="flex justify-center"
            page={currentViewedMove + 1}
            total={currentMove + 1}
            onChange={(page) => {
              setCurrentViewedMove(page - 1);
            }}
            showControls
          />
        </div>
        <div className="col-span-1">
          <TicTacToePlayerBoard />
        </div>
      </div>
    </div>
  );
}

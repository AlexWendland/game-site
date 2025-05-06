"use client";

import { TicTacToeBoard } from "@/components/tictactoe/TicTacToeBoard";
import { TicTacToePlayerBoard } from "@/components/tictactoe/TicTacToePlayerBoard";
import { Button, Input } from "@heroui/react";
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

  const moves = history.map((_, move) => {
    return (
      <li key={move}>
        <Button
          onPress={() => setCurrentViewedMove(move)}
          size="sm"
          color="secondary"
          className="text-lg"
        >
          {move}
        </Button>
      </li>
    );
  });

  return (
    <div>
      <div className="grid grid-cols-8 gap-4 width-full">
        <div className="col-span-1">
          <h2 className="font-semibold mb-2 text-xl text-center">History</h2>
          <ol className="flex flex-wrap gap-4 items-center">{moves}</ol>
        </div>
        <div className="col-span-6">
          <TicTacToeBoard />
        </div>
        <div className="col-span-1">
          <TicTacToePlayerBoard />
        </div>
      </div>
    </div>
  );
}

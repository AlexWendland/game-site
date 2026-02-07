"use client";

import { TicTacToeBoard } from "@/components/tictactoe/TicTacToeBoard";
import { TicTacToePlayerPieces } from "@/components/tictactoe/TicTacToePlayerPieces";
import { Pagination } from "@/components/common/Pagination";
import { useTicTacToeContext } from "@/components/tictactoe/TicTacToeContext";

export function TicTacToeGame() {
  const {
    gameState,
    players,
    currentMove,
    currentPlayerNumber,
    currentViewedMove,
    setCurrentViewedMove,
  } = useTicTacToeContext();

  const winner = gameState?.winner ?? null;
  const currentPlayer = players[currentPlayerNumber];

  const status =
    winner !== null
      ? `Winner: ${players[winner] ? players[winner].displayName : "Unassigned"}`
      : currentMove == 9
        ? "Draw"
        : `Next player: ${currentPlayer ? currentPlayer.displayName : "Unassigned"}`;

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

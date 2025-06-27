"use client";

import { UltimateBoard } from "@/components/ultimate/UltimateBoard";
import { UltimatePlayerPieces } from "@/components/ultimate/UltimatePlayerPieces";
import { Pagination } from "@/components/common/Pagination";
import { useUltimateHistoryContext } from "./UltimateContext";

export function UltimateGame() {
  const {
    players,
    currentPlayer,
    winner,
    currentMove,
    currentViewedMove,
    setCurrentViewedMove,
  } = useUltimateHistoryContext();

  const gameStatus =
    winner !== null
      ? `Winner: ${players[winner % 2] || "Unassigned"}`
      : currentMove == 81
        ? // TODO: Work out how to determine a draw properly
          "Draw"
        : `Next player: ${currentPlayer || "Unassigned"}`;

  return (
    <div className="flex flex-col items-center gap-4 w-full h-full p-2">
      <div className="text-2xl font-bold text-center">{gameStatus}</div>
      <UltimatePlayerPieces>
        <UltimateBoard />
      </UltimatePlayerPieces>
      <div className="flex justify-center">
        <Pagination
          current={currentViewedMove + 1}
          max={currentMove + 1}
          min={1}
          onChange={(page) => {
            setCurrentViewedMove(page - 1);
          }}
        />
      </div>
    </div>
  );
}

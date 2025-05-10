"use client";

import { UltimateBoard } from "@/components/ultimate/UltimateBoard";
import { UltimatePlayerBoard } from "@/components/ultimate/UltimatePlayerBoard";
import { Pagination } from "@heroui/react";
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
    <div className="grid grid-cols-1 justify-items-center width-full">
      <div className="text-lg font-semibold text-center pb-4">{gameStatus}</div>
      <UltimatePlayerBoard />
      <UltimateBoard />
      <br />
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
  );
}

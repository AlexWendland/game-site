"use client";

import { TopologicalBoard } from "@/components/topological/TopologicalBoard";
import { TopologicalPlayerBoard } from "@/components/topological/TopologicalPlayerBoard";
import { Pagination } from "@heroui/react";
import { useTopologicalGameContext } from "@/components/topological/TopologicalContext";

export function TopologicalGame() {
  const {
    boardSize,
    players,
    currentMove,
    currentPlayer,
    winner,
    currentViewedMove,
    setCurrentViewedMove,
  } = useTopologicalGameContext();

  const status =
    winner !== null
      ? `Winner: ${players[winner] === null ? "Unassigned" : players[winner]}`
      : currentMove == boardSize * boardSize
        ? "Draw"
        : `Next player: ${currentPlayer === null ? "Unassigned" : currentPlayer}`;

  return (
    <div>
      <div className="grid grid-cols-1 justify-items-center gap-4 w-full h-full p-2">
        <div className="text-2xl font-bold">{status}</div>
        <TopologicalPlayerBoard />
        <div className="hidden md:block"></div>
        <TopologicalBoard />
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

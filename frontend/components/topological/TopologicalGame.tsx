"use client";

import { TopologicalBoard } from "@/components/topological/TopologicalBoard";
import { TopologicalPlayerPieces } from "@/components/topological/TopologicalPlayerPieces";
import { Pagination } from "@/components/common/Pagination";
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
      <div className="flex flex-col items-center gap-4 w-full h-full p-2">
        <div className="text-2xl font-bold">{status}</div>
        <TopologicalPlayerPieces>
          <TopologicalBoard />
        </TopologicalPlayerPieces>
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
    </div>
  );
}

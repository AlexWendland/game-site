"use client";

import { useState } from "react";
import UltimateFlipCard from "@/components/ultimate/UltimateFlipCard";
import { UltimateSectorBoard } from "./UltimateSectorBoard";
import clsx from "clsx";

export function UltimateSector({
  sectorIndex,
  sectorWinningMove,
  isHighlighted,
}: {
  sectorIndex: number;
  sectorWinningMove: number | null;
  isHighlighted: boolean;
}) {
  const front = (
    <div className="w-full h-full flex items-center justify-center bg-white border border-gray-400 p-2 border-1">
      <UltimateSectorBoard sectorIndex={sectorIndex} />
    </div>
  );
  const sectorWinner =
    sectorWinningMove === null ? null : sectorWinningMove % 2;

  const backText = sectorWinner == 0 ? "X" : "O";
  const textColor =
    sectorWinner === 0
      ? "text-black-600"
      : sectorWinner === 1
        ? "text-red-500"
        : "text-transparent";

  const back = (
    <div
      className={clsx(
        "w-full h-full flex items-center justify-center text-9xl font-bold bg-white text-black border border-gray-400 border-2",
        textColor,
        isHighlighted ? "bg-yellow-200" : "bg-white",
      )}
    >
      {backText}
    </div>
  );

  return (
    <div className="flex flex-col items-center space-y-4 mt-10">
      <UltimateFlipCard
        showBack={sectorWinner != null}
        front={front}
        back={back}
      />
    </div>
  );
}

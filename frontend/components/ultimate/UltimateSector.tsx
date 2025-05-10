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
  const boxCSS =
    "w-full h-full flex items-center justify-center bg-gray-50 border border-gray-400";
  const front = (
    <div className={clsx(boxCSS, "p-2")}>
      <UltimateSectorBoard sectorIndex={sectorIndex} />
    </div>
  );
  const sectorWinner =
    sectorWinningMove === null ? null : sectorWinningMove % 2;

  const backText = sectorWinner == 0 ? "✖️" : "⭕";
  const textColor =
    sectorWinner === 0
      ? "text-gray-900"
      : sectorWinner === 1
        ? "text-red-500"
        : "text-transparent";

  const textSize =
    sectorWinner === 0
      ? "text-9xl sm:text-[210px]"
      : "text-[80px] sm:text-[150px]";

  const back = (
    <div
      className={clsx(
        boxCSS,
        "border",
        textColor,
        textSize,
        isHighlighted ? "bg-yellow-200" : "bg-white",
      )}
    >
      {backText}
    </div>
  );

  return (
    <div className="flex flex-col items-center">
      <UltimateFlipCard
        showBack={sectorWinner != null}
        front={front}
        back={back}
      />
    </div>
  );
}

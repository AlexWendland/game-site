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

  const back = (
    <div
      className={clsx(
        boxCSS,
        "border",
        isHighlighted ? "bg-yellow-200" : "bg-white",
      )}
    >
      {sectorWinner === 0 ? (
        <img src="/cross.svg" className="p-1 sm:p-2" />
      ) : (
        <img src="/nought.svg" className="p-1 sm:p-2" />
      )}
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

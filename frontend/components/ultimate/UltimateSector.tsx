"use client";

import { useState } from "react";
import UltimateFlipCard from "@/components/ultimate/UltimateFlipCard";
import { UltimateSectorBoard } from "./UltimateSectorBoard";

export function UltimateSector() {
  const [flipped, setFlipped] = useState(true);

  const keys: number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  const moves: number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8];

  const front = (
    <div className="w-full h-full flex items-center justify-center bg-white border border-gray-400 p-2 border-1">
      <UltimateSectorBoard keys={keys} moves={moves} />
    </div>
  );

  const back = (
    <div className="w-full h-full flex items-center justify-center text-9xl font-bold bg-white text-black border border-gray-400 border-2 text-red-500">
      O
    </div>
  );

  return (
    <div className="flex flex-col items-center space-y-4 mt-10">
      <UltimateFlipCard flipped={flipped} front={front} back={back} />
    </div>
  );
}

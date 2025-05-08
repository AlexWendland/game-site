"use client";

import { useState } from "react";
import FlipCard from "@/components/utility/FlipCard";

export function UltimateSector() {
  const [flipped, setFlipped] = useState(true);

  const front = (
    <div className="w-full h-full flex items-center justify-center bg-white grid grid-cols-3">
      <div> X </div>
      <div> X </div>
      <div> X </div>
      <div> X </div>
      <div> X </div>
      <div> X </div>
      <div> X </div>
      <div> X </div>
      <div> X </div>
    </div>
  );

  const back = (
    <div className="w-full h-full flex items-center justify-center text-5xl font-bold bg-white text-black">
      O
    </div>
  );

  return (
    <div className="flex flex-col items-center space-y-4 mt-10">
      <FlipCard flipped={flipped} front={front} back={back} />
      <button
        onClick={() => setFlipped(!flipped)}
        className="px-4 py-2 bg-blue-500 text-white rounded"
      >
        Flip
      </button>
    </div>
  );
}

"use client";

import { useState } from "react";
import { QuantumBoard } from "@/components/quantum/QuantumBoard";
import { QuantumActionSpace } from "@/components/quantum/QuantumActionSpace";
import { QuantumHintLevelSlider } from "@/components/quantum/QuantumHintLevelSlider";
import { useQuantumContext } from "@/components/quantum/QuantumContext";

export function QuantumGame() {
  const { status, gameState, currentUserPosition, maxHintLevel, setHintLevel } =
    useQuantumContext();
  const [selectedTargetPlayer, setSelectedTargetPlayer] = useState<
    number | null
  >(null);

  const currentHintLevel =
    gameState && currentUserPosition !== null
      ? gameState.hint_levels[currentUserPosition]
      : 0;

  const mySuitName =
    gameState && currentUserPosition !== null
      ? gameState.suit_names[currentUserPosition]
      : null;

  return (
    <div>
      <div className="grid grid-cols-1 justify-items-center gap-4 w-full h-full p-2">
        {/* Status */}
        <div className="text-2xl font-bold text-center">{status}</div>

        {/* Game board */}
        <QuantumBoard setSelectedTargetPlayer={setSelectedTargetPlayer} />

        {/* Action space with hint slider */}
        <div className="flex items-start gap-4 w-full justify-center">
          {/* Fills the space of the slider on the other side. */}
          {mySuitName && (
            <div className="hidden sm:block sm:invisible flex-shrink-0">
              <QuantumHintLevelSlider
                currentLevel={currentHintLevel}
                maxLevel={maxHintLevel}
                onLevelChange={setHintLevel}
                disabled={currentUserPosition === null}
              />
            </div>
          )}
          <QuantumActionSpace
            selectedTargetPlayer={selectedTargetPlayer}
            setSelectedTargetPlayer={setSelectedTargetPlayer}
          />

          {/* Compact hint level slider */}
          {mySuitName && (
            <div className="flex-shrink-0">
              <QuantumHintLevelSlider
                currentLevel={currentHintLevel}
                maxLevel={maxHintLevel}
                onLevelChange={setHintLevel}
                disabled={currentUserPosition === null}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

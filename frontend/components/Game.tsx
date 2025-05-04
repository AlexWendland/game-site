"use client";

import { NCBoard } from "@/components/NCBoard";
import { PlayerBoard } from "@/components/PlayerBoard";
import { Button, Input } from "@heroui/react";
import { useGameContext } from "@/components/GameContext";

export function Game() {
  const {
    history,
    players,
    currentMove,
    currentPlayer,
    winner,
    winningLine,
    currentUserName,
    currentUserPosition,
    currentViewedMove,
    setCurrentViewedMove,
    updateCurrentUserName,
    updateCurrentUserPosition,
    makeMove,
  } = useGameContext();

  const moves = history.map((_, move) => {
    return (
      <li key={move}>
        <Button
          onPress={() => setCurrentViewedMove(move)}
          size="sm"
          color="secondary"
          className="text-lg"
        >
          {move}
        </Button>
      </li>
    );
  });

  return (
    <div>
      <div className="grid grid-cols-8 gap-4 width-full">
        <div className="col-span-1">
          <h2 className="font-semibold mb-2 text-xl text-center">History</h2>
          <ol className="flex flex-wrap gap-4 items-center">{moves}</ol>
        </div>
        <div className="col-span-6">
          <NCBoard />
        </div>
        <div className="col-span-1">
          <PlayerBoard />
          <br />
          <Input
            onValueChange={updateCurrentUserName}
            description="Username"
            color="primary"
          />
        </div>
      </div>
    </div>
  );
}

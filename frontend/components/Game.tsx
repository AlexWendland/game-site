"use client";

import { useState } from "react";
import { BoardValue } from "@/types/gameTypes";
import { NCBoard } from "@/components/NCBoard";
import { PlayerBoard } from "@/components/PlayerBoard";
import { Button } from "@heroui/button";

export function Game() {
  const [history, setHistory] = useState<BoardValue[]>([Array(9).fill(null)]);
  const [currentMove, setCurrentMove] = useState(0);
  const [usersPlayer, setUsersPlayer] = useState(0);
  const xIsNext = currentMove % 2 === 0;
  const currentSquares = history[currentMove];

  function handlePlay(nextSquares: BoardValue) {
    const nextHistory = [...history.slice(0, currentMove + 1), nextSquares];
    setHistory(nextHistory);
    setCurrentMove(nextHistory.length - 1);
  }

  function jumpTo(nextMove: number) {
    setCurrentMove(nextMove);
  }

  const moves = history.map((_, move) => {
    return (
      <li key={move}>
        <Button
          onPress={() => jumpTo(move)}
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
          <NCBoard
            xIsNext={xIsNext}
            currentPlayer={usersPlayer}
            squares={currentSquares}
            onPlay={handlePlay}
          />
        </div>
        <div className="col-span-1">
          <PlayerBoard
            currentUserPlayer={usersPlayer}
            setCurrentUserPlayer={setUsersPlayer}
          />
        </div>
      </div>
    </div>
  );
}

import { useCallback } from "react";
import { Button } from "@heroui/button";
import clsx from "clsx";

interface PlayerBoardProps {
  currentUserPlayer: number; // 0 = none, 1 = Cross, 2 = Naught
  setCurrentUserPlayer: (player: number) => void;
}

export function PlayerBoard({
  currentUserPlayer,
  setCurrentUserPlayer,
}: PlayerBoardProps) {
  const handleSelect = useCallback(
    (player: number) => {
      setCurrentUserPlayer(currentUserPlayer === player ? 0 : player);
    },
    [currentUserPlayer, setCurrentUserPlayer],
  );

  const players = [
    { id: 1, name: "Cross", icon: "✖️" },
    { id: 2, name: "Naught", icon: "⭕" },
  ];

  return (
    <div className="w-full max-w-sm border rounded-xl p-4 bg-white shadow-md">
      <h2 className="text-center text-xl font-semibold mb-4">Players</h2>
      <div className="space-y-3">
        {players.map((player) => {
          const isSelected = currentUserPlayer === player.id;
          return (
            <Button
              key={player.id}
              variant="outline"
              className={clsx(
                "flex items-center justify-between w-full px-4 py-2 text-left",
                isSelected && "border-blue-500 bg-blue-50",
              )}
              onPress={() => handleSelect(player.id)}
            >
              <span className="flex items-center space-x-2">
                <span>{player.icon}</span>
                <span>{player.name}</span>
              </span>
              {isSelected && <span className="text-sm text-gray-700">You</span>}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

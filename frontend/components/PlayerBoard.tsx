import { useCallback } from "react";
import { Button } from "@heroui/button";
import clsx from "clsx";
import { setPlayer, unsetPlayer } from "@/lib/apiCalls";

interface PlayerBoardProps {
  gameID: string;
  currentUserPlayer: number; // 0 = none, 1 = Cross, 2 = Naught
  setCurrentUserPlayer: (player: number) => void;
}

export function PlayerBoard({
  gameID,
  currentUserPlayer,
  setCurrentUserPlayer,
}: PlayerBoardProps) {
  const handleSelect = useCallback(
    async (player: number) => {
      console.log("Setting player:", player);
      try {
        if (currentUserPlayer === player) {
          await unsetPlayer(gameID, player, "Test Name");
        } else {
          await unsetPlayer(gameID, player == 1 ? 2 : 1, "Test Name");
          await setPlayer(gameID, player, "Test Name");
        }
      } catch (error) {
        console.error("Error setting player:", error);
        return;
      }
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
              variant="light"
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

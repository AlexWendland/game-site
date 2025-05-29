import { useTicTacToePlayerContext } from "@/components/tictactoe/TicTacToeContext";
import { TicTacToePlayerSlot } from "./TicTacToePlayerSlot";

export function TicTacToePlayerBoard() {
  const {
    players,
    aiPlayers,
    currentUserPosition,
    aiModels,
    updateCurrentUserPosition,
    removeAIPlayer,
    addAIPlayer,
  } = useTicTacToePlayerContext();

  const availablePlayers = [
    { id: 0, name: "Cross", icon: <img src="/cross.png" width="30" /> },
    { id: 1, name: "Nought", icon: <img src="/nought.png" width="30" /> },
  ];

  return (
    <div className="w-full max-w-sm border rounded-xl p-4 bg-gray-50 shadow-md">
      <h2 className="text-center text-xl font-semibold mb-4">Players</h2>
      <div className="space-y-3">
        {availablePlayers.map((player) => {
          const isSelected = currentUserPosition === player.id;
          const isAI = player.id in aiPlayers;
          const isOccupied = players[player.id] !== null;
          return (
            <TicTacToePlayerSlot
              key={player.id}
              playerName={players[player.id]}
              icon={player.icon}
              isCurrentUser={isSelected}
              isOccupiedByHuman={isOccupied && !isAI}
              isOccupiedByAI={isAI}
              aiModels={aiModels}
              movePlayer={() => {
                updateCurrentUserPosition(player.id);
              }}
              removePlayer={() => {
                updateCurrentUserPosition(null);
              }}
              addAIPlayer={(model: string) => {
                addAIPlayer(player.id, model);
              }}
              removeAIPlayer={() => {
                removeAIPlayer(player.id);
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

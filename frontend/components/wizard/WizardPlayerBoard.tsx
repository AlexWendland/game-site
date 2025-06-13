import { useWizardPlayerContext } from "@/components/wizard/WizardContext";
import { PlayerSlot } from "@/components/common/PlayerSlot";

export function WizardPlayerBoard() {
  const {
    players,
    maxPlayers,
    aiPlayers,
    currentUserPosition,
    aiModels,
    updateCurrentUserPosition,
    removeAIPlayer,
    addAIPlayer,
  } = useWizardPlayerContext();

  return (
    <div className="w-full max-w-sm border rounded-xl p-4 bg-gray-50 shadow-md">
      <h2 className="text-center text-xl font-semibold mb-4">Players</h2>
      <div className="space-y-3">
        {Array.from({ length: maxPlayers }, (_, id) => {
          const isSelected = currentUserPosition === id;
          const isAI = id in aiPlayers;
          const isOccupied = players[id] !== null;
          return (
            <PlayerSlot
              key={id}
              playerName={players[id]}
              icon={id}
              isCurrentUser={isSelected}
              isOccupiedByHuman={isOccupied && !isAI}
              isOccupiedByAI={isAI}
              aiModels={aiModels}
              movePlayer={() => {
                updateCurrentUserPosition(id);
              }}
              removePlayer={() => {
                updateCurrentUserPosition(null);
              }}
              addAIPlayer={(model: string) => {
                addAIPlayer(id, model);
              }}
              removeAIPlayer={() => {
                removeAIPlayer(id);
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

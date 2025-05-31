import {
  Button,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
} from "@heroui/react";
import clsx from "clsx";
import { ReactNode } from "react";

type PlayerSlotProps = {
  playerName: string | null;
  icon: ReactNode;
  isCurrentUser: boolean;
  isOccupiedByHuman: boolean;
  isOccupiedByAI: boolean;
  aiModels: Record<string, string>;
  movePlayer: () => void;
  removePlayer: () => void;
  addAIPlayer: (model: string) => void;
  removeAIPlayer: () => void;
};

export function TicTacToePlayerSlot({
  playerName,
  icon,
  isCurrentUser,
  isOccupiedByHuman,
  isOccupiedByAI,
  aiModels,
  movePlayer,
  removePlayer,
  addAIPlayer,
  removeAIPlayer,
}: PlayerSlotProps) {
  return (
    <div
      className={clsx(
        "boarder rounded-lg flex items-center justify-between w-full px-4 py-2 text-left",
        isCurrentUser && "border-blue-500 bg-blue-50",
      )}
    >
      <span className="flex items-center space-x-2 text-gray-700">
        <span>{icon}</span>
        <span>{playerName}</span>
      </span>
      <div className="flex space-x-2">
        {isCurrentUser && (
          <Button size="sm" onPress={removePlayer}>
            Leave
          </Button>
        )}

        {!isCurrentUser && !isOccupiedByHuman && !isOccupiedByAI && (
          <>
            <Button size="sm" onPress={movePlayer}>
              Move here
            </Button>
            <Dropdown>
              <DropdownTrigger>
                <Button size="sm">Add AI</Button>
              </DropdownTrigger>
              <DropdownMenu aria-label="Static Actions">
                {Object.entries(aiModels).map(([model_key, model_name]) => (
                  <DropdownItem
                    key={model_key}
                    onPress={() => addAIPlayer(model_key)}
                  >
                    {model_name}
                  </DropdownItem>
                ))}
              </DropdownMenu>
            </Dropdown>
          </>
        )}

        {!isCurrentUser && isOccupiedByAI && (
          <Button size="sm" onPress={removeAIPlayer}>
            Remove AI
          </Button>
        )}
      </div>
    </div>
  );
}

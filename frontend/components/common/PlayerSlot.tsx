import clsx from "clsx";
import { ReactNode, useEffect, useRef, useState } from "react";

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

type SVGProps = React.SVGProps<SVGSVGElement> & {
  size?: number;
  height?: number;
  width?: number;
};

export const Leave: React.FC<SVGProps> = ({
  size,
  height,
  width,
  ...props
}) => {
  return (
    <svg
      height={size || height || 24}
      width={size || width || 24}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        fillOpacity="0"
        strokeWidth="3"
        stroke="currentColor"
      />
      <rect width="7" height="7" x="8.5" y="8.5" rx="1" fill="currentColor" />
    </svg>
  );
};

export const Join: React.FC<SVGProps> = ({ size, height, width, ...props }) => {
  return (
    <svg
      height={size || height || 24}
      width={size || width || 24}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        fillOpacity="0"
        strokeWidth="3"
        stroke="currentColor"
      />
      <path
        d="M15.51 11.14a1 1 0 0 1 0 1.72l-5 3A1 1 0 0 1 9 15V9a1 1 0 0 1 1.51-.86l5 3z"
        fill="currentColor"
      />
    </svg>
  );
};

export const Remove: React.FC<SVGProps> = ({
  size,
  height,
  width,
  ...props
}) => {
  return (
    <svg
      height={size || height || 24}
      width={size || width || 24}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        fillOpacity="0"
        strokeWidth="3"
        stroke="currentColor"
      />
      <path
        fillRule="evenodd"
        fill="currentColor"
        d="M17 11a1 1 0 0 1 0 2H7a1 1 0 0 1 0-2h10z"
      />
    </svg>
  );
};

export const Add: React.FC<SVGProps> = ({ size, height, width, ...props }) => {
  return (
    <svg
      height={size || height || 24}
      width={size || width || 24}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        fillOpacity="0"
        strokeWidth="3"
        stroke="currentColor"
      />
      <path
        fillRule="evenodd"
        fill="currentColor"
        d="M17 11a1 1 0 0 1 0 2h-4v4a1 1 0 0 1-2 0v-4H7a1 1 0 0 1 0-2h4V7a1 1 0 0 1 2 0v4h4z"
      />
    </svg>
  );
};

export function PlayerSlot({
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
  // Dropdown state
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const toggleDropdown = () => setIsDropdownOpen((prev) => !prev);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div
      className={clsx(
        "rounded-lg flex items-center justify-between w-full px-4 py-2 text-left",
        isCurrentUser && "bg-blue-100 dark:bg-blue-900",
      )}
    >
      <span className="flex items-center space-x-2">
        <span className="w-10 h-full aspect-square object-contain">{icon}</span>
        <span>{playerName}</span>
      </span>
      <div className="flex space-x-2">
        {isCurrentUser && (
          <button onClick={removePlayer} type="button" aria-label="Leave game">
            <Leave
              size={30}
              className="text-red-500 hover:text-red-400 dark:text-red-200 dark:hover:text-red-100 w-8 h-8 hover:scale-110 transition-all"
            />
          </button>
        )}

        {!isCurrentUser && !isOccupiedByHuman && !isOccupiedByAI && (
          <div className="flex space-x-2">
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={toggleDropdown}
                aria-expanded={isDropdownOpen}
                aria-haspopup="true"
                className="flex items-center"
                aria-label="Add AI player"
                type="button"
              >
                <Add
                  size={30}
                  className="text-green-700 dark:text-green-200 hover:text-green-400 dark:hover:text-green-100 w-8 h-8 hover:scale-110 transition-all"
                />
              </button>
              <div
                className={`absolute left-1/2 transform -translate-x-1/2 mt-2 w-64 bg-gray-100 dark:bg-gray-800 shadow-lg rounded-lg transition-all duration-200 ease-out origin-top grid grid-cols-1 z-50 ${
                  isDropdownOpen
                    ? "scale-100 opacity-100"
                    : "scale-95 opacity-0 pointer-events-none"
                }`}
              >
                {Object.entries(aiModels).map(([model_key, model_name]) => (
                  <button
                    key={model_key}
                    onClick={() => addAIPlayer(model_key)}
                    className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg"
                    type="button"
                    aria-label={`Add ${model_name} AI player`}
                  >
                    {model_name}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={movePlayer} type="button" aria-label="Join game">
              <Join
                className="text-green-700 dark:text-green-200 hover:text-green-400 dark:hover:text-green-100 w-8 h-8 hover:scale-110 transition-all"
                size={30}
              />
            </button>
          </div>
        )}

        {!isCurrentUser && isOccupiedByAI && (
          <button
            onClick={removeAIPlayer}
            type="button"
            aria-label="Remove AI player"
          >
            <Remove
              className="text-red-500 hover:text-red-400 dark:text-red-200 dark:hover:text-red-100 w-8 h-8 hover:scale-110 transition-all"
              size={30}
            />
          </button>
        )}
      </div>
    </div>
  );
}

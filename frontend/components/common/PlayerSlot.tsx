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
      <path d="M9 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8z" fill="currentColor" />
      <path
        d="M15 9h6a1 1 0 0 1 0 2h-6a1 1 0 0 1 0-2zm1 10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-1a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v1z"
        fill="currentColor"
      />
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
      <path d="M9 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8z" fill="currentColor" />
      <path
        d="M17 9V7a1 1 0 0 1 2 0v2h2a1 1 0 0 1 0 2h-2v2a1 1 0 0 1-2 0v-2h-2a1 1 0 0 1 0-2h2zm-1 10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-1a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v1z"
        fill="currentColor"
      />
    </svg>
  );
};

export const RemoveAI: React.FC<SVGProps> = ({
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
      <path
        d="M9 15C8.44771 15 8 15.4477 8 16C8 16.5523 8.44771 17 9 17C9.55229 17 10 16.5523 10 16C10 15.4477 9.55229 15 9 15Z"
        fill="currentColor"
      />
      <path
        d="M14 16C14 15.4477 14.4477 15 15 15C15.5523 15 16 15.4477 16 16C16 16.5523 15.5523 17 15 17C14.4477 17 14 16.5523 14 16Z"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 1C10.8954 1 10 1.89543 10 3C10 3.74028 10.4022 4.38663 11 4.73244V7H6C4.34315 7 3 8.34315 3 10V20C3 21.6569 4.34315 23 6 23H18C19.6569 23 21 21.6569 21 20V10C21 8.34315 19.6569 7 18 7H13V4.73244C13.5978 4.38663 14 3.74028 14 3C14 1.89543 13.1046 1 12 1ZM5 10C5 9.44772 5.44772 9 6 9H7.38197L8.82918 11.8944C9.16796 12.572 9.86049 13 10.618 13H13.382C14.1395 13 14.832 12.572 15.1708 11.8944L16.618 9H18C18.5523 9 19 9.44772 19 10V20C19 20.5523 18.5523 21 18 21H6C5.44772 21 5 20.5523 5 20V10ZM13.382 11L14.382 9H9.61803L10.618 11H13.382Z"
        fill="currentColor"
      />
      <path
        d="M1 14C0.447715 14 0 14.4477 0 15V17C0 17.5523 0.447715 18 1 18C1.55228 18 2 17.5523 2 17V15C2 14.4477 1.55228 14 1 14Z"
        fill="currentColor"
      />
      <path
        d="M22 15C22 14.4477 22.4477 14 23 14C23.5523 14 24 14.4477 24 15V17C24 17.5523 23.5523 18 23 18C22.4477 18 22 17.5523 22 17V15Z"
        fill="currentColor"
      />
      <path d="M18 2 H24 V4 H18 Z" fill="currentColor" />
    </svg>
  );
};

export const AddAI: React.FC<SVGProps> = ({
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
      <path
        d="M9 15C8.44771 15 8 15.4477 8 16C8 16.5523 8.44771 17 9 17C9.55229 17 10 16.5523 10 16C10 15.4477 9.55229 15 9 15Z"
        fill="currentColor"
      />
      <path
        d="M14 16C14 15.4477 14.4477 15 15 15C15.5523 15 16 15.4477 16 16C16 16.5523 15.5523 17 15 17C14.4477 17 14 16.5523 14 16Z"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 1C10.8954 1 10 1.89543 10 3C10 3.74028 10.4022 4.38663 11 4.73244V7H6C4.34315 7 3 8.34315 3 10V20C3 21.6569 4.34315 23 6 23H18C19.6569 23 21 21.6569 21 20V10C21 8.34315 19.6569 7 18 7H13V4.73244C13.5978 4.38663 14 3.74028 14 3C14 1.89543 13.1046 1 12 1ZM5 10C5 9.44772 5.44772 9 6 9H7.38197L8.82918 11.8944C9.16796 12.572 9.86049 13 10.618 13H13.382C14.1395 13 14.832 12.572 15.1708 11.8944L16.618 9H18C18.5523 9 19 9.44772 19 10V20C19 20.5523 18.5523 21 18 21H6C5.44772 21 5 20.5523 5 20V10ZM13.382 11L14.382 9H9.61803L10.618 11H13.382Z"
        fill="currentColor"
      />
      <path
        d="M1 14C0.447715 14 0 14.4477 0 15V17C0 17.5523 0.447715 18 1 18C1.55228 18 2 17.5523 2 17V15C2 14.4477 1.55228 14 1 14Z"
        fill="currentColor"
      />
      <path
        d="M22 15C22 14.4477 22.4477 14 23 14C23.5523 14 24 14.4477 24 15V17C24 17.5523 23.5523 18 23 18C22.4477 18 22 17.5523 22 17V15Z"
        fill="currentColor"
      />
      <path d="M18 2 H24 V4 H18 Z" fill="currentColor" />
      <path d="M20 0 V6 H22 V0 Z" fill="currentColor" />
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
                <AddAI
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
            <RemoveAI
              className="text-red-500 hover:text-red-400 dark:text-red-200 dark:hover:text-red-100 w-8 h-8 hover:scale-110 transition-all"
              size={30}
            />
          </button>
        )}
      </div>
    </div>
  );
}

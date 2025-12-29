import { useState } from "react";
import { QuantumHintLevel } from "@/types/apiTypes";
import { EyeIcon, EyeSlashIcon, CheckIcon } from "./QuantumIcons";

type QuantumHintLevelSliderPresenterProps = {
  currentLevel: QuantumHintLevel;
  maxLevel: QuantumHintLevel;
  onLevelChange: (level: QuantumHintLevel) => void;
  disabled?: boolean;
};

export function QuantumHintLevelSliderPresenter({
  currentLevel,
  maxLevel,
  onLevelChange,
  disabled = false,
}: QuantumHintLevelSliderPresenterProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const hintLevels = [
    {
      level: QuantumHintLevel.NONE,
      name: "None",
      description: "No hints about cards",
      icon: <EyeSlashIcon />,
    },
    {
      level: QuantumHintLevel.TRACK,
      name: "Track",
      description: "Track which cards are held",
      icon: <EyeIcon />,
    },
    {
      level: QuantumHintLevel.FULL,
      name: "Full",
      description: "Complete information visibility",
      icon: <CheckIcon />,
    },
  ].filter((h) => h.level <= maxLevel);

  const currentLevelData = hintLevels.find((h) => h.level === currentLevel);

  return (
    <div className="relative">
      {/* Compact vertical slider */}
      <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-2 flex flex-col items-center space-y-2">
        {/* Header with tooltip trigger */}
        <div
          className="relative"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <div className="text-xs font-medium text-gray-600 dark:text-gray-400 cursor-help">
            Hints
          </div>

          {/* Tooltip */}
          {showTooltip && currentLevelData && (
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs bg-black dark:bg-white text-white dark:text-black rounded shadow-lg whitespace-nowrap z-10">
              {currentLevelData.description}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-2 border-transparent border-t-black dark:border-t-white"></div>
            </div>
          )}
        </div>

        {/* Vertical level buttons */}
        <div className="flex flex-col-reverse space-y-reverse space-y-1">
          {hintLevels.map(({ level, name, icon }) => {
            const isSelected = currentLevel === level;
            const isBelowCurrent = level < currentLevel;
            const isAboveMax = level > maxLevel;
            const isDisabledLevel = disabled || isBelowCurrent || isAboveMax;

            return (
              <button
                key={level}
                onClick={() => !isDisabledLevel && onLevelChange(level)}
                disabled={isDisabledLevel}
                title={name}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                  isSelected
                    ? "bg-yellow-400 dark:bg-yellow-800 text-gray-800 dark:text-gray-200 shadow-lg scale-110"
                    : isDisabledLevel
                      ? "bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400 cursor-not-allowed opacity-40"
                      : "bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-yellow-200 dark:hover:bg-yellow-800 hover:text-gray-800 dark:hover:text-gray-200 cursor-pointer hover:scale-105"
                }`}
              >
                {icon}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

type QuantumHintLevelSliderProps = {
  currentLevel: QuantumHintLevel;
  maxLevel: QuantumHintLevel;
  onLevelChange: (level: QuantumHintLevel) => void;
  disabled?: boolean;
};

export function QuantumHintLevelSlider(props: QuantumHintLevelSliderProps) {
  return <QuantumHintLevelSliderPresenter {...props} />;
}

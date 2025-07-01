import clsx from "clsx";
import { useState } from "react";
import { AddAI, Join, Leave, RemoveAI } from "@/components/common/PlayerSlot";
import { useIsMobile } from "@/context/BrowserContext";
import {
  QuantumGameStateData,
  QuantumGameState,
  QuantumHandState,
  useQuantumContext,
} from "./QuantumContext";
import { QuantumHintLevel } from "@/types/apiTypes";
import { EyeIcon, EyeSlashIcon, CheckIcon } from "./QuantumIcons";

type QuantumPlayerCardProps = {
  playerNumber: number;
  playerName: string | null;
  isActive: boolean;
  isViewingPlayerActive: boolean;
  // Player management props
  isCurrentUser: boolean;
  isOccupiedByHuman: boolean;
  isOccupiedByAI: boolean;
  aiModels: Record<string, string>;
  playerHasJoined: boolean;
  movePlayer: () => void;
  removePlayer: () => void;
  addAIPlayer: (model: string) => void;
  removeAIPlayer: () => void;
  gameState: QuantumGameStateData | null;
  // Click handler for targeting (optional)
  onPlayerClick?: (playerNumber: number) => void;
  // Add guess editing capability
  showGuessEditor?: boolean;
};

export function QuantumPlayerCard({
  playerNumber,
  playerName,
  isActive,
  isViewingPlayerActive,
  isCurrentUser,
  isOccupiedByHuman,
  isOccupiedByAI,
  aiModels,
  playerHasJoined,
  movePlayer,
  removePlayer,
  addAIPlayer,
  removeAIPlayer,
  gameState,
  onPlayerClick,
  showGuessEditor = false,
}: QuantumPlayerCardProps) {
  const isMobile = useIsMobile();
  const [isHovered, setIsHovered] = useState(false);
  const [isMobileModalOpen, setIsMobileModalOpen] = useState(false);
  const [isAIDropdownOpen, setIsAIDropdownOpen] = useState(false);

  // Get quantum context for guess editing
  const {
    playerGuess,
    canIncreasePlayerGuess,
    increasePlayerGuess,
    canDecreasePlayerGuess,
    decreasePlayerGuess,
    canTogglePlayerDoesNotHaveSuit,
    togglePlayerDoesNotHaveSuit,
    resetPlayerGuess,
    currentUserPosition,
  } = useQuantumContext();

  // Helper functions for rendering icons
  const PlusIcon = ({ size = 16, className = "" }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
    </svg>
  );

  const MinusIcon = ({ size = 16, className = "" }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M19 13H5v-2h14v2z" />
    </svg>
  );

  const ListIcon = ({ size = 16, className = "" }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" />
    </svg>
  );

  const ToggleOnIcon = ({ size = 16, className = "" }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M17 7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h10c2.76 0 5-2.24 5-5s-2.24-5-5-5zM17 15c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z" />
    </svg>
  );

  const ToggleOffIcon = ({ size = 16, className = "" }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M17 7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h10c2.76 0 5-2.24 5-5s-2.24-5-5-5zM7 15c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z" />
    </svg>
  );

  // Check if current user can edit guesses
  const canEditGuesses =
    showGuessEditor && currentUserPosition !== null && gameState;

  // Get all suits for the current game
  const getAllSuits = () => {
    if (!gameState) return [];
    const suits = [];
    // Get all suits from suit_names or infer from current_hands
    const maxSuits = Object.keys(gameState.current_hands).length;
    for (let i = 0; i < maxSuits; i++) {
      suits.push({
        id: i,
        name: gameState.suit_names[i] || `Suit ${i}`,
      });
    }
    return suits;
  };

  const hasActions =
    isCurrentUser ||
    (!isOccupiedByHuman && !isOccupiedByAI) ||
    isOccupiedByAI ||
    canEditGuesses;

  // Check if this player can be targeted
  const canBeTargeted =
    gameState?.game_state === QuantumGameState.TARGET_PLAYER &&
    gameState?.current_player !== playerNumber &&
    isViewingPlayerActive &&
    playerHasJoined;

  // Get contradiction count for this player from backend data
  const getContradictionCount = () => {
    if (!gameState) return 0;
    return gameState.contradiction_count[playerNumber] || 0;
  };

  // Get status info for visual indicators
  const getStatusInfo = () => {
    if (isCurrentUser)
      return {
        color: "bg-blue-700 dark:bg-blue-300",
        label: "You",
        icon: "👤",
      };
    if (isOccupiedByAI)
      return { color: "bg-yellow-500", label: "AI", icon: "🤖" };
    if (isOccupiedByHuman)
      return { color: "bg-green-500", label: "Player", icon: "👥" };
    return {
      color: "bg-gray-700 dark:bg-gray-300",
      label: "Empty",
      icon: "➕",
    };
  };

  const statusInfo = getStatusInfo();
  const isEmpty = !playerName && !isOccupiedByHuman && !isOccupiedByAI;

  const handleCardClick = () => {
    if (canBeTargeted) {
      onPlayerClick?.(playerNumber);
    } else if (isMobile && (hasActions || canEditGuesses)) {
      setIsMobileModalOpen(true);
    }
  };

  const renderDesktopHoverActions = () => {
    if (isMobile || !isHovered || !hasActions || canBeTargeted) return null;

    return (
      <div className="absolute inset-0 bg-black bg-opacity-50 dark:bg-opacity-80 rounded-lg flex items-center justify-center transition-all duration-200">
        <div className="flex flex-col sm:flex-row sm:space-x-2 gap-2 rounded-lg p-3 shadow-lg">
          {isCurrentUser && (
            <button
              onClick={removePlayer}
              className="flex items-center space-x-1 px-2 py-1 sm:px-3 sm:py-2 bg-red-100 hover:bg-red-200 dark:bg-red-800 dark:hover:bg-red-700 text-red-600 dark:text-red-300 rounded-md transition-colors"
              title="Leave game"
            >
              <Leave size={16} />
              <span className="text-sm font-medium hidden lg:block">Leave</span>
            </button>
          )}

          {!isCurrentUser && !isOccupiedByHuman && !isOccupiedByAI && (
            <>
              <div className="relative">
                <button
                  onClick={() => setIsAIDropdownOpen(!isAIDropdownOpen)}
                  className="flex items-center space-x-1 px-2 py-1 sm:px-3 sm:py-2 bg-yellow-200 hover:bg-yellow-400 dark:bg-yellow-700 dark:hover:bg-yellow-600 text-yellow-700 dark:text-yellow-200 rounded-md transition-colors"
                  title="Add AI player"
                >
                  <AddAI size={16} />
                  <span className="text-sm font-medium hidden lg:block">
                    AI
                  </span>
                </button>
                {isAIDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 shadow-lg rounded-lg border border-gray-200 dark:border-gray-600 z-50 min-w-32">
                    {Object.entries(aiModels).map(([key, name]) => (
                      <button
                        key={key}
                        onClick={() => {
                          addAIPlayer(key);
                          setIsAIDropdownOpen(false);
                        }}
                        className="block w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm first:rounded-t-lg last:rounded-b-lg"
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={movePlayer}
                className="flex items-center space-x-1 px-2 py-1 sm:px-3 sm:py-2 bg-green-100 hover:bg-green-200 dark:bg-green-900 dark:hover:bg-green-800 text-green-600 dark:text-green-300 rounded-md transition-colors"
                title="Join game"
              >
                <Join size={16} />
                <span className="text-sm font-medium hidden lg:block">
                  Join
                </span>
              </button>
            </>
          )}

          {!isCurrentUser && isOccupiedByAI && (
            <button
              onClick={removeAIPlayer}
              className="flex items-center space-x-1 px-2 py-1 sm:px-3 sm:py-2 bg-red-100 hover:bg-red-200 dark:bg-red-900 dark:hover:bg-red-800 text-red-600 dark:text-red-300 rounded-md transition-colors"
              title="Remove AI player"
            >
              <RemoveAI size={16} />
              <span className="text-sm font-medium hidden lg:block">
                Remove
              </span>
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderGuessEditor = () => {
    if (!canEditGuesses || !gameState || !playerGuess[playerNumber])
      return null;

    const suits = getAllSuits();
    const actualHand = gameState.current_hands[playerNumber];
    const guessHand = playerGuess[playerNumber];

    return (
      <div className="mt-4 border-t border-gray-300 dark:border-gray-600 pt-4">
        <h4 className="text-lg font-semibold text-center mb-3">
          Edit Player Guess
        </h4>

        <div className="space-y-2 max-h-60 overflow-y-auto">
          {suits.map((suit) => {
            const actualCount = actualHand?.suits[suit.id] || 0;
            const guessCount = guessHand?.suits[suit.id] || 0;
            const doesNotHave =
              guessHand?.does_not_have_suit?.includes(suit.id) || false;

            return (
              <div
                key={suit.id}
                className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                {/* Toggle button */}
                <button
                  onClick={() =>
                    canTogglePlayerDoesNotHaveSuit(playerNumber, suit.id) &&
                    togglePlayerDoesNotHaveSuit(playerNumber, suit.id)
                  }
                  disabled={
                    !canTogglePlayerDoesNotHaveSuit(playerNumber, suit.id)
                  }
                  className={clsx(
                    "p-1 rounded transition-colors",
                    doesNotHave
                      ? "text-red-500 hover:text-red-600"
                      : "text-green-500 hover:text-green-600",
                    !canTogglePlayerDoesNotHaveSuit(playerNumber, suit.id) &&
                      "opacity-50 cursor-not-allowed",
                  )}
                  title={
                    doesNotHave
                      ? "Mark as may have suit"
                      : "Mark as doesn't have suit"
                  }
                >
                  {doesNotHave ? (
                    <ToggleOffIcon size={20} />
                  ) : (
                    <ToggleOnIcon size={20} />
                  )}
                </button>

                {/* Suit name and counts */}
                <div className="flex-1 text-center">
                  <div className="font-medium text-sm">{suit.name}</div>
                  <div className="flex items-center justify-center space-x-2 mt-1">
                    {/* Actual count in blue */}
                    <span className="text-blue-600 dark:text-blue-400 font-medium">
                      {actualCount}
                    </span>
                    {/* Guess count in yellow (only if different) */}
                    {guessCount !== actualCount && (
                      <span className="text-yellow-600 dark:text-yellow-400 font-medium">
                        ({guessCount})
                      </span>
                    )}
                  </div>
                </div>

                {/* Plus/minus buttons */}
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() =>
                      canDecreasePlayerGuess(playerNumber, suit.id) &&
                      decreasePlayerGuess(playerNumber, suit.id)
                    }
                    disabled={!canDecreasePlayerGuess(playerNumber, suit.id)}
                    className={clsx(
                      "p-1 rounded transition-colors",
                      "text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900",
                      !canDecreasePlayerGuess(playerNumber, suit.id) &&
                        "opacity-50 cursor-not-allowed",
                    )}
                    title="Decrease guess"
                  >
                    <MinusIcon size={18} />
                  </button>
                  <button
                    onClick={() =>
                      canIncreasePlayerGuess(playerNumber, suit.id) &&
                      increasePlayerGuess(playerNumber, suit.id)
                    }
                    disabled={!canIncreasePlayerGuess(playerNumber, suit.id)}
                    className={clsx(
                      "p-1 rounded transition-colors",
                      "text-green-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900",
                      !canIncreasePlayerGuess(playerNumber, suit.id) &&
                        "opacity-50 cursor-not-allowed",
                    )}
                    title="Increase guess"
                  >
                    <PlusIcon size={18} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex space-x-2 mt-4">
          <button
            onClick={() => resetPlayerGuess(playerNumber)}
            className="flex-1 px-3 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
          >
            Reset
          </button>
        </div>
      </div>
    );
  };

  const renderMobileModal = () => {
    if (!isMobileModalOpen || !hasActions) return null;
    const backgroundColor = "bg-gray-100 dark:bg-gray-800";

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div
          className={`${backgroundColor} rounded-xl p-6 max-w-sm w-full shadow-2xl border border-gray-200 dark:border-gray-600`}
        >
          <div className="text-center">
            <div className="text-2xl mb-2">{statusInfo.icon}</div>
            <h3 className="text-lg font-semibold">
              {playerName || "Empty Slot"}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {statusInfo.label}
            </p>
            {/* Display hand information */}
            {gameState && (
              <div className="mt-1">
                {/* Total cards, hint level, and contradictions */}
                <div className="flex items-center justify-center space-x-2 mb-1">
                  <span className="text-xs text-gray-600 dark:text-gray-300">
                    <span className="text-blue-600 dark:text-blue-400">
                      {gameState.current_hands[playerNumber].total_cards}
                    </span>
                  </span>
                  <div className="w-3 h-3 text-gray-500 dark:text-gray-400">
                    {gameState.hint_levels[playerNumber] ===
                      QuantumHintLevel.NONE && <EyeSlashIcon />}
                    {gameState.hint_levels[playerNumber] ===
                      QuantumHintLevel.TRACK && <EyeIcon />}
                    {gameState.hint_levels[playerNumber] ===
                      QuantumHintLevel.FULL && <CheckIcon />}
                  </div>
                  <div className="text-red-500 dark:text-red-400 text-xs font-medium">
                    {getContradictionCount()}
                  </div>
                </div>

                {/* Hand information */}
                {gameState.current_hands[playerNumber] && (
                  <div className="text-xs space-y-0.5">
                    {/* Known suits they have */}
                    {Object.entries(
                      gameState.current_hands[playerNumber].suits,
                    ).map(([suitId, count]) => {
                      if (suitId === "-1") return null; // Skip suit ID -1
                      const suitName =
                        gameState.suit_names[parseInt(suitId)] ||
                        `Suit ${suitId}`;
                      const guessCount =
                        canEditGuesses && playerGuess[playerNumber]
                          ? playerGuess[playerNumber].suits[parseInt(suitId)] ||
                            0
                          : null;

                      return count > 0 ? (
                        <div key={suitId} className="text-center">
                          <span className="text-blue-600 dark:text-blue-400">
                            {suitName}: {count}
                          </span>
                          {guessCount !== null && guessCount !== count && (
                            <span className="text-yellow-600 dark:text-yellow-400 ml-1">
                              ({guessCount})
                            </span>
                          )}
                        </div>
                      ) : null;
                    })}

                    {/* Suits they don't have */}
                    {gameState.current_hands[
                      playerNumber
                    ].does_not_have_suit?.map((suitId) => {
                      const suitName =
                        gameState.suit_names[suitId] || `Suit ${suitId}`;
                      return (
                        <div
                          key={suitId}
                          className="text-center text-red-500 dark:text-red-400"
                        >
                          <span className="line-through">{suitName}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="space-y-3 mt-4">
            {isCurrentUser && (
              <button
                onClick={() => {
                  removePlayer();
                  setIsMobileModalOpen(false);
                }}
                className="w-full flex items-center justify-center space-x-3 bg-red-500 hover:bg-red-600 active:bg-red-700 text-white py-4 rounded-lg font-medium transition-colors"
              >
                <Leave size={20} />
                <span>Leave Game</span>
              </button>
            )}

            {!isCurrentUser && !isOccupiedByHuman && !isOccupiedByAI && (
              <>
                <button
                  onClick={() => {
                    movePlayer();
                    setIsMobileModalOpen(false);
                  }}
                  className="w-full flex items-center justify-center space-x-3 bg-green-500 active:bg-green-700 text-white py-4 rounded-lg font-medium transition-colors"
                >
                  <Join size={20} />
                  <span>Join Game</span>
                </button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300 dark:border-gray-600" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span
                      className={`${backgroundColor} px-2 text-gray-500 dark:text-gray-400`}
                    >
                      or add AI
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  {Object.entries(aiModels).map(([key, name]) => (
                    <button
                      key={key}
                      onClick={() => {
                        addAIPlayer(key);
                        setIsMobileModalOpen(false);
                      }}
                      className="w-full flex items-center justify-center space-x-3 bg-yellow-500 active:bg-yellow-700 text-yellow-800 py-3 rounded-lg font-medium transition-colors"
                    >
                      <AddAI size={18} />
                      <span>Add {name} AI</span>
                    </button>
                  ))}
                </div>
              </>
            )}

            {!isCurrentUser && isOccupiedByAI && (
              <button
                onClick={() => {
                  removeAIPlayer();
                  setIsMobileModalOpen(false);
                }}
                className="w-full flex items-center justify-center space-x-3 bg-red-500 active:bg-red-700 text-white py-4 rounded-lg font-medium transition-colors"
              >
                <RemoveAI size={20} />
                <span>Remove AI Player</span>
              </button>
            )}
          </div>

          {/* Render guess editor */}
          {renderGuessEditor()}

          <button
            onClick={() => setIsMobileModalOpen(false)}
            className="w-full mt-6 py-3 text-gray-600 dark:text-gray-400 dark:hover:text-gray-200 font-medium transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  };

  const renderDiscoverabilityHints = () => {
    return (
      <>
        {/* Status indicator */}
        <div
          className={clsx(
            "absolute top-1 sm:top-2 left-1 sm:left-2 z-10",
            isMobile ? "opacity-80" : "opacity-60",
          )}
        >
          <div
            className={clsx(`w-2.5 h-2.5 rounded-full ${statusInfo.color}`, {
              "animate-ping": isEmpty && !playerHasJoined,
            })}
          />
        </div>

        {/* Target hint */}
        {canBeTargeted && (
          <div className="absolute top-0 sm:top-1 md:top-2 right-0 sm:right-1 md:right-2 text-orange-500 dark:text-orange-400 scale-75 sm:scale-100 animate-pulse">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </div>
        )}

        {/* Hover label */}
        {!isMobile && isHovered && (
          <div className="hidden sm:block absolute top-2 left-6 z-10 opacity-60">
            <span className="text-xs bg-black dark:bg-white text-white dark:text-black px-2 py-1 rounded shadow-lg">
              {canBeTargeted ? "Click to target" : statusInfo.label}
            </span>
          </div>
        )}
      </>
    );
  };

  return (
    <>
      <div
        className={clsx(
          "relative",
          "bg-gray-200 dark:bg-gray-700 rounded-lg shadow-md transition-all duration-300 ease-in-out",
          // Responsive sizing
          "w-24 sm:w-32 lg:w-40 max-w-sm mx-auto p-2 sm:p-3",
          // Interactive states
          {
            "ring-2 ring-yellow-400 ring-opacity-70 animate-pulse": isActive,
            "ring-2 ring-orange-400 ring-opacity-70 cursor-pointer hover:shadow-lg hover:scale-105":
              canBeTargeted,
            "cursor-pointer": hasActions || canBeTargeted,
            // Desktop hover effects
            "hover:shadow-lg hover:scale-105":
              !isMobile && hasActions && !canBeTargeted,
            // Mobile tap effects
            "active:scale-95": isMobile && (hasActions || canBeTargeted),
          },
        )}
        onMouseEnter={() => !isMobile && setIsHovered(true)}
        onMouseLeave={() => {
          if (!isMobile) {
            setIsHovered(false);
            setIsAIDropdownOpen(false);
          }
        }}
        onClick={handleCardClick}
      >
        {renderDiscoverabilityHints()}

        <div className="relative z-0">
          <h3
            className={clsx(
              "font-bold text-center truncate",
              "text-xs sm:text-sm lg:text-base",
            )}
          >
            {playerName || "Waiting..."}
          </h3>

          {/* Type of user */}
          <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-1">
            {statusInfo.label}
          </p>

          {/* Display hand information */}
          {gameState && (
            <div className="mt-1">
              {/* Total cards, hint level, and contradictions */}
              <div className="flex items-center justify-center space-x-1 mb-1">
                <div className="flex-grow text-center text-xs text-gray-600 dark:text-gray-300">
                  {gameState.current_hands[playerNumber]?.total_cards || 0}
                </div>
                <div className="text-gray-500 dark:text-gray-400">
                  {gameState.hint_levels[playerNumber] ===
                    QuantumHintLevel.NONE && (
                    <EyeSlashIcon className="w-3 h-3" />
                  )}
                  {gameState.hint_levels[playerNumber] ===
                    QuantumHintLevel.TRACK && <EyeIcon className="w-3 h-3" />}
                  {gameState.hint_levels[playerNumber] ===
                    QuantumHintLevel.FULL && <CheckIcon className="w-3 h-3" />}
                </div>
                <div className="text-red-500 dark:text-red-400 text-xs text-center font-medium flex-grow">
                  {getContradictionCount()}
                </div>
              </div>

              {/* Hand information */}
              {gameState.current_hands[playerNumber] && (
                <div className="text-xs space-y-0.5">
                  {/* Known suits they have */}
                  {Object.entries(
                    gameState.current_hands[playerNumber].suits,
                  ).map(([suitId, count]) => {
                    if (suitId === "-1") return null; // Skip suit ID -1
                    const suitName =
                      gameState.suit_names[parseInt(suitId)] ||
                      `Suit ${suitId}`;
                    const guessCount =
                      canEditGuesses && playerGuess[playerNumber]
                        ? playerGuess[playerNumber].suits[parseInt(suitId)] || 0
                        : null;

                    return count > 0 ? (
                      <div key={suitId} className="text-center">
                        <span className="text-blue-600 dark:text-blue-400">
                          {suitName}: {count}
                        </span>
                        {guessCount !== null && guessCount !== count && (
                          <span className="text-yellow-600 dark:text-yellow-400 ml-1">
                            ({guessCount})
                          </span>
                        )}
                      </div>
                    ) : null;
                  })}

                  {/* Suits they don't have */}
                  {gameState.current_hands[
                    playerNumber
                  ].does_not_have_suit?.map((suitId) => {
                    const suitName =
                      gameState.suit_names[suitId] || `Suit ${suitId}`;
                    const guessDoesNotHave =
                      canEditGuesses && playerGuess[playerNumber]
                        ? playerGuess[
                            playerNumber
                          ].does_not_have_suit?.includes(suitId)
                        : true;

                    return (
                      <div
                        key={suitId}
                        className="text-center text-red-500 dark:text-red-400"
                      >
                        <span className="line-through">{suitName}</span>
                        {canEditGuesses && !guessDoesNotHave && (
                          <span className="text-yellow-600 dark:text-yellow-400 ml-1">
                            (?)
                          </span>
                        )}
                      </div>
                    );
                  })}

                  {/* Show guessed suits that aren't in actual hands */}
                  {canEditGuesses &&
                    playerGuess[playerNumber] &&
                    Object.entries(playerGuess[playerNumber].suits).map(
                      ([suitId, guessCount]) => {
                        if (suitId === "-1") return null; // Skip suit ID -1
                        const actualCount =
                          gameState.current_hands[playerNumber].suits[
                            parseInt(suitId)
                          ] || 0;
                        const suitName =
                          gameState.suit_names[parseInt(suitId)] ||
                          `Suit ${suitId}`;

                        // Only show if guess differs from actual and actual is 0
                        if (actualCount === 0 && guessCount > 0) {
                          return (
                            <div
                              key={`guess-${suitId}`}
                              className="text-center"
                            >
                              <span className="text-yellow-600 dark:text-yellow-400">
                                {suitName}: ({guessCount})
                              </span>
                            </div>
                          );
                        }
                        return null;
                      },
                    )}

                  {/* Show guessed suits that player thinks they don't have but aren't in actual does_not_have_suit */}
                  {canEditGuesses &&
                    playerGuess[playerNumber] &&
                    playerGuess[playerNumber].does_not_have_suit?.map(
                      (suitId) => {
                        const actualDoesNotHave =
                          gameState.current_hands[
                            playerNumber
                          ].does_not_have_suit?.includes(suitId);
                        const suitName =
                          gameState.suit_names[suitId] || `Suit ${suitId}`;

                        // Only show if guess differs from actual
                        if (!actualDoesNotHave) {
                          return (
                            <div
                              key={`guess-no-${suitId}`}
                              className="text-center"
                            >
                              <span className="text-yellow-600 dark:text-yellow-400 line-through">
                                {suitName}
                              </span>
                            </div>
                          );
                        }
                        return null;
                      },
                    )}
                </div>
              )}
            </div>
          )}
        </div>

        {renderDesktopHoverActions()}

        {/* Desktop guess editor button */}
        {!isMobile && canEditGuesses && (
          <button
            onClick={() => setIsMobileModalOpen(true)}
            className="absolute bottom-1 right-1 z-20 p-1.5 bg-blue-100 hover:bg-blue-200 dark:bg-blue-800 dark:hover:bg-blue-700 text-blue-600 dark:text-blue-300 rounded-full shadow-md transition-colors"
            title="Edit player guess"
          >
            <ListIcon size={14} />
          </button>
        )}
      </div>

      {renderMobileModal()}
    </>
  );
}

import clsx from "clsx";
import { useEffect, useState, useRef } from "react";
import { AddAI, Join, Leave, RemoveAI } from "@/components/common/Icons";
import { useIsMobile } from "@/context/BrowserContext";
import {
  QuantumGameStateData,
  QuantumGameState,
  useQuantumContext,
  QuantumHandState,
} from "./QuantumContext";
import { QuantumHintLevel } from "@/types/apiTypes";
import {
  EyeIcon,
  EyeSlashIcon,
  CheckIcon,
  PlusIcon,
  MinusIcon,
  ToggleOnIcon,
  ToggleOffIcon,
  ListIcon,
} from "./QuantumIcons";

// Base props for all presenters
type BasePlayerCardProps = {
  playerNumber: number;
  playerName: string | null;
  isActive: boolean;
  isViewingPlayerActive: boolean;
  isCurrentUser: boolean;
  isOccupiedByHuman: boolean;
  isOccupiedByAI: boolean;
  setSelectedTargetPlayer: (playerNumber: number) => void;
};

// Container component props (minimal - just what's needed from parent)
type QuantumPlayerCardProps = BasePlayerCardProps;

// Status info type
type StatusInfo = {
  color: string;
  label: string;
  icon: string;
};

// Hand display presenter props
type HandDisplayProps = {
  gameState: QuantumGameStateData;
  playerNumber: number;
  canEditGuesses: boolean;
  playerGuess?: Record<number, QuantumHandState>;
};

// Actions presenter props
type ActionsPresenterProps = {
  isCurrentUser: boolean;
  isOccupiedByHuman: boolean;
  isOccupiedByAI: boolean;
  aiModels: Record<string, string>;
  isAIDropdownOpen: boolean;
  setIsAIDropdownOpen: (open: boolean) => void;
  onRemovePlayer: () => void;
  onMovePlayer: () => void;
  onAddAIPlayer: (model: string) => void;
  onRemoveAIPlayer: () => void;
};

// Modal presenter props
type ModalPresenterProps = {
  isOpen: boolean;
  onClose: () => void;
  playerName: string | null;
  statusInfo: StatusInfo;
  gameState: QuantumGameStateData | null;
  handDisplayProps?: HandDisplayProps;
  actionsProps: ActionsPresenterProps;
  guessEditorProps?: GuessEditorProps;
};

// Guess editor props
type GuessEditorProps = {
  gameState: QuantumGameStateData;
  playerNumber: number;
  playerGuess: Record<number, QuantumHandState>;
  canIncreasePlayerGuess: (player: number, suit: number) => boolean;
  increasePlayerGuess: (player: number, suit: number) => void;
  canDecreasePlayerGuess: (player: number, suit: number) => boolean;
  decreasePlayerGuess: (player: number, suit: number) => void;
  canTogglePlayerDoesNotHaveSuit: (player: number, suit: number) => boolean;
  togglePlayerDoesNotHaveSuit: (player: number, suit: number) => void;
  resetPlayerGuess: (player: number) => void;
};

// Main card presenter props
type CardPresenterProps = {
  playerName: string | null;
  isActive: boolean;
  statusInfo: StatusInfo;
  hasActions: boolean;
  canBeTargeted: boolean;
  isMobile: boolean;
  isHovered: boolean;
  setIsHovered: (hovered: boolean) => void;
  setIsAIDropdownOpen: (open: boolean) => void;
  onCardClick: () => void;
  canEditGuesses: boolean;
  onOpenGuessEditor: () => void;
  handDisplayProps?: HandDisplayProps;
  actionsPresenterProps?: ActionsPresenterProps;
  hintsProps: {
    statusInfo: StatusInfo;
    isEmpty: boolean;
    canBeTargeted: boolean;
    playerHasJoined: boolean;
    isMobile: boolean;
    isHovered: boolean;
  };
};

// Hand Display Presenter
function QuantumPlayerHandPresenter({
  gameState,
  playerNumber,
  canEditGuesses,
  playerGuess,
}: HandDisplayProps) {
  const getContradictionCount = () => {
    return gameState.contradiction_count[playerNumber] || 0;
  };

  if (!gameState.current_hands[playerNumber]) return null;

  return (
    <div className="mt-1 @container">
      {/* Total cards, hint level, and contradictions */}
      <div className="grid grid-cols-3 items-center mb-1">
        <div className="grid grid-cols-1">
          <div className="text-sm @[6rem]:text-lg @[10rem]:text-xl text-center">
            {gameState.current_hands[playerNumber]?.total_cards || 0}
          </div>
          <div className="hidden @[6rem]:block text-sm text-gray-500 dark:text-gray-400 text-center">
            Cards
          </div>
        </div>
        <div className="text-gray-500 dark:text-gray-400 flex justify-center">
          {gameState.hint_levels[playerNumber] === QuantumHintLevel.NONE && (
            <EyeSlashIcon className="w-4 h-4 @[6rem]:w-5 @[6rem]:h-5 @[10rem]:w-6 @[10rem]:h-6" />
          )}
          {gameState.hint_levels[playerNumber] === QuantumHintLevel.TRACK && (
            <EyeIcon className="w-4 h-4 @[6rem]:w-5 @[6rem]:h-5 @[10rem]:w-6 @[10rem]:h-6" />
          )}
          {gameState.hint_levels[playerNumber] === QuantumHintLevel.FULL && (
            <CheckIcon className="w-4 h-4 @[6rem]:w-5 @[6rem]:h-5 @[10rem]:w-6 @[10rem]:h-6" />
          )}
        </div>
        <div className="grid grid-cols-1">
          <div className="text-red-500 dark:text-red-400 text-sm @[6rem]:text-lg @[10rem]:text-xl text-center font-medium">
            {getContradictionCount()}
          </div>
          <div className="hidden @[6rem]:block text-red-300 dark:text-red-500 text-sm text-center">
            Errors
          </div>
        </div>
      </div>

      {/* Hand information */}
      <div className="text-xs @[12rem]:text-sm space-y-0.5">
        {/* Known suits they have */}
        {Object.entries(gameState.current_hands[playerNumber].suits).map(
          ([suitId, count]) => {
            if (suitId === "-1") return null; // Skip suit ID -1
            const suitName =
              gameState.suit_names[parseInt(suitId)] || `Suit ${suitId}`;
            const guessCount =
              canEditGuesses && playerGuess?.[playerNumber]
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
          },
        )}

        {/* Suits they don't have */}
        {gameState.current_hands[playerNumber].does_not_have_suit?.map(
          (suitId) => {
            const suitName = gameState.suit_names[suitId] || `Suit ${suitId}`;
            const guessDoesNotHave =
              canEditGuesses && playerGuess?.[playerNumber]
                ? playerGuess[playerNumber].does_not_have_suit?.includes(suitId)
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
          },
        )}

        {/* Show guessed suits that aren't in actual hands */}
        {canEditGuesses &&
          playerGuess?.[playerNumber] &&
          Object.entries(playerGuess[playerNumber].suits).map(
            ([suitId, guessCount]) => {
              if (suitId === "-1") return null; // Skip suit ID -1
              const actualCount =
                gameState.current_hands[playerNumber].suits[parseInt(suitId)] ||
                0;
              const suitName =
                gameState.suit_names[parseInt(suitId)] || `Suit ${suitId}`;

              // Only show if guess differs from actual and actual is 0
              if (actualCount === 0 && guessCount > 0) {
                return (
                  <div key={`guess-${suitId}`} className="text-center">
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
          playerGuess?.[playerNumber] &&
          playerGuess[playerNumber].does_not_have_suit?.map((suitId) => {
            const actualDoesNotHave =
              gameState.current_hands[
                playerNumber
              ].does_not_have_suit?.includes(suitId);
            const suitName = gameState.suit_names[suitId] || `Suit ${suitId}`;

            // Only show if guess differs from actual
            if (!actualDoesNotHave) {
              return (
                <div key={`guess-no-${suitId}`} className="text-center">
                  <span className="text-yellow-600 dark:text-yellow-400 line-through">
                    {suitName}
                  </span>
                </div>
              );
            }
            return null;
          })}
      </div>
    </div>
  );
}

// Discoverability Hints Presenter
function QuantumPlayerHintsPresenter({
  statusInfo,
  isEmpty,
  canBeTargeted,
  playerHasJoined,
  isMobile,
  isHovered,
}: {
  statusInfo: StatusInfo;
  isEmpty: boolean;
  canBeTargeted: boolean;
  playerHasJoined: boolean;
  isMobile: boolean;
  isHovered: boolean;
}) {
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
            "animate-pulse": canBeTargeted,
          })}
        />
      </div>

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
}

// Desktop Actions Presenter
function QuantumPlayerActionsPresenter({
  isCurrentUser,
  isOccupiedByHuman,
  isOccupiedByAI,
  aiModels,
  isAIDropdownOpen,
  setIsAIDropdownOpen,
  onRemovePlayer,
  onMovePlayer,
  onAddAIPlayer,
  onRemoveAIPlayer,
}: ActionsPresenterProps) {
  return (
    <div className="absolute inset-0 bg-black bg-opacity-50 dark:bg-opacity-80 rounded-lg flex items-center justify-center transition-all duration-200">
      <div className="flex flex-col sm:flex-row sm:space-x-2 gap-2 rounded-lg p-3 shadow-lg">
        {isCurrentUser && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemovePlayer();
            }}
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
                onClick={(e) => {
                  e.stopPropagation();
                  setIsAIDropdownOpen(!isAIDropdownOpen);
                }}
                className="flex items-center space-x-1 px-2 py-1 sm:px-3 sm:py-2 bg-yellow-200 hover:bg-yellow-400 dark:bg-yellow-700 dark:hover:bg-yellow-600 text-yellow-700 dark:text-yellow-200 rounded-md transition-colors"
                title="Add AI player"
              >
                <AddAI size={16} />
                <span className="text-sm font-medium hidden lg:block">AI</span>
              </button>
              {isAIDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 shadow-lg rounded-lg border border-gray-200 dark:border-gray-600 z-50 min-w-32">
                  {Object.entries(aiModels).map(([key, name]) => (
                    <button
                      key={key}
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddAIPlayer(key);
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
              onClick={(e) => {
                e.stopPropagation();
                onMovePlayer();
              }}
              className="flex items-center space-x-1 px-2 py-1 sm:px-3 sm:py-2 bg-green-100 hover:bg-green-200 dark:bg-green-900 dark:hover:bg-green-800 text-green-600 dark:text-green-300 rounded-md transition-colors"
              title="Join game"
            >
              <Join size={16} />
              <span className="text-sm font-medium hidden lg:block">Join</span>
            </button>
          </>
        )}

        {!isCurrentUser && isOccupiedByAI && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemoveAIPlayer();
            }}
            className="flex items-center space-x-1 px-2 py-1 sm:px-3 sm:py-2 bg-red-100 hover:bg-red-200 dark:bg-red-900 dark:hover:bg-red-800 text-red-600 dark:text-red-300 rounded-md transition-colors"
            title="Remove AI player"
          >
            <RemoveAI size={16} />
            <span className="text-sm font-medium hidden lg:block">Remove</span>
          </button>
        )}
      </div>
    </div>
  );
}

// Guess Editor Presenter
function QuantumGuessEditorPresenter({
  gameState,
  playerNumber,
  playerGuess,
  canIncreasePlayerGuess,
  increasePlayerGuess,
  canDecreasePlayerGuess,
  decreasePlayerGuess,
  canTogglePlayerDoesNotHaveSuit,
  togglePlayerDoesNotHaveSuit,
  resetPlayerGuess,
}: GuessEditorProps) {
  const getAllSuits = () => {
    const suits = [];
    const maxSuits = Object.keys(gameState.current_hands).length;
    for (let i = 0; i < maxSuits; i++) {
      suits.push({
        id: i,
        name: gameState.suit_names[i] || `Suit ${i}`,
      });
    }
    return suits;
  };

  const suits = getAllSuits();
  const actualHand = gameState.current_hands[playerNumber];
  const guessHand = playerGuess[playerNumber];

  if (!actualHand || !guessHand) return null;

  return (
    <div className="mt-4 border-t border-gray-300 dark:border-gray-600 pt-4">
      <h4 className="text-lg font-semibold text-center mb-3">Your Guess</h4>

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
                  <ToggleOffIcon className="w-5 h-5" />
                ) : (
                  <ToggleOnIcon className="w-5 h-5" />
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
                  <MinusIcon className="w-4 h-4" />
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
                  <PlusIcon className="w-4 h-4" />
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
          Reset Guess
        </button>
      </div>
    </div>
  );
}

function QuantumPlayerModalPresenter({
  isOpen,
  onClose,
  playerName,
  statusInfo,
  gameState,
  handDisplayProps,
  actionsProps,
  guessEditorProps,
}: ModalPresenterProps) {
  const backgroundColor = "bg-gray-100 dark:bg-gray-800";
  const modalRef = useRef<HTMLDivElement>(null);
  const [shouldCenter, setShouldCenter] = useState(true);

  // This turns off scrolling on background elements.
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add("overflow-hidden");
    } else {
      document.body.classList.remove("overflow-hidden");
    }

    // Clean up on unmount
    return () => {
      document.body.classList.remove("overflow-hidden");
    };
  }, [isOpen]);

  // Check if modal should be centered or top-aligned
  useEffect(() => {
    const checkModalPosition = () => {
      if (modalRef.current) {
        const modalHeight = modalRef.current.offsetHeight;
        const viewportHeight = window.innerHeight;
        const padding = 32; // Account for p-4 (16px on each side)

        setShouldCenter(modalHeight + padding < viewportHeight);
      }
    };

    if (!isOpen || !modalRef.current) return;

    checkModalPosition();

    // Listen for viewport changes (resize, orientation change)
    window.addEventListener("resize", checkModalPosition);
    window.addEventListener("orientationchange", checkModalPosition);

    // Watch the modal element for size changes
    const resizeObserver = new ResizeObserver(checkModalPosition);
    resizeObserver.observe(modalRef.current);

    return () => {
      window.removeEventListener("resize", checkModalPosition);
      window.removeEventListener("orientationchange", checkModalPosition);
      resizeObserver.disconnect();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 bg-black bg-opacity-50 flex justify-center ${shouldCenter ? "items-center" : "items-start"} z-50 p-4 overflow-auto`}
    >
      <div
        ref={modalRef}
        className={`${backgroundColor} rounded-xl p-6 max-w-sm w-full shadow-2xl border border-gray-200 dark:border-gray-600`}
      >
        <div className="text-center">
          <div className="text-2xl mb-2">{statusInfo.icon}</div>
          <h3 className="text-2xl font-semibold">
            {playerName || "Empty Slot"}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {statusInfo.label}
          </p>

          {/* Display hand information */}
          {gameState && handDisplayProps && (
            <QuantumPlayerHandPresenter {...handDisplayProps} />
          )}
        </div>

        {/* Actions */}
        <div className="space-y-3 mt-4">
          {actionsProps.isCurrentUser && (
            <button
              onClick={() => {
                actionsProps.onRemovePlayer();
                onClose();
              }}
              className="w-full flex items-center justify-center space-x-3 bg-red-500 hover:bg-red-600 active:bg-red-700 text-white py-4 rounded-lg font-medium transition-colors"
            >
              <Leave size={20} />
              <span>Leave Game</span>
            </button>
          )}

          {!actionsProps.isCurrentUser &&
            !actionsProps.isOccupiedByHuman &&
            !actionsProps.isOccupiedByAI && (
              <>
                <button
                  onClick={() => {
                    actionsProps.onMovePlayer();
                    onClose();
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
                  {Object.entries(actionsProps.aiModels).map(([key, name]) => (
                    <button
                      key={key}
                      onClick={() => {
                        actionsProps.onAddAIPlayer(key);
                        onClose();
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

          {!actionsProps.isCurrentUser && actionsProps.isOccupiedByAI && (
            <button
              onClick={() => {
                actionsProps.onRemoveAIPlayer();
                onClose();
              }}
              className="w-full flex items-center justify-center space-x-3 bg-red-500 active:bg-red-700 text-white py-4 rounded-lg font-medium transition-colors"
            >
              <RemoveAI size={20} />
              <span>Remove AI Player</span>
            </button>
          )}
        </div>

        {/* Render guess editor */}
        {guessEditorProps && (
          <QuantumGuessEditorPresenter {...guessEditorProps} />
        )}

        <button
          onClick={onClose}
          className="w-full mt-6 py-3 text-gray-600 dark:text-gray-400 dark:hover:text-gray-200 font-medium transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// Main Card Presenter
function QuantumPlayerCardPresenter({
  playerName,
  isActive,
  statusInfo,
  hasActions,
  canBeTargeted,
  isMobile,
  isHovered,
  setIsHovered,
  setIsAIDropdownOpen,
  onCardClick,
  canEditGuesses,
  onOpenGuessEditor,
  handDisplayProps,
  actionsPresenterProps,
  hintsProps,
}: CardPresenterProps) {
  return (
    <div
      className={clsx(
        "relative",
        "bg-gray-200 dark:bg-gray-700 rounded-lg shadow-md transition-all duration-300 ease-in-out",
        // Responsive sizing
        "w-24 sm:w-40 lg:w-64 max-w-sm mx-auto p-2 sm:p-3",
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
      onClick={onCardClick}
    >
      <QuantumPlayerHintsPresenter {...hintsProps} />

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
        {handDisplayProps && (
          <QuantumPlayerHandPresenter {...handDisplayProps} />
        )}
      </div>

      {/* Desktop hover actions */}
      {!isMobile &&
        isHovered &&
        hasActions &&
        !canBeTargeted &&
        actionsPresenterProps && (
          <QuantumPlayerActionsPresenter {...actionsPresenterProps} />
        )}

      {/* Desktop guess editor button */}
      {!isMobile && canEditGuesses && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenGuessEditor();
          }}
          className="absolute top-1 right-1 z-20 p-1.5 bg-blue-100 hover:bg-blue-200 dark:bg-blue-800 dark:hover:bg-blue-700 text-blue-600 dark:text-blue-300 rounded-full shadow-md transition-colors"
          title="Edit player guess"
        >
          <ListIcon className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

// Container Component
export function QuantumPlayerCard({
  playerNumber,
  playerName,
  isActive,
  isViewingPlayerActive,
  isCurrentUser,
  isOccupiedByHuman,
  isOccupiedByAI,
  setSelectedTargetPlayer,
}: QuantumPlayerCardProps) {
  const isMobile = useIsMobile();
  const [isHovered, setIsHovered] = useState(false);
  const [isGuessModalOpen, setIsGuessModelOpen] = useState(false);
  const [isAIDropdownOpen, setIsAIDropdownOpen] = useState(false);

  // Get data from context
  const {
    gameState,
    currentUserPosition,
    updateCurrentUserPosition,
    playerGuess,
    canIncreasePlayerGuess,
    increasePlayerGuess,
    canDecreasePlayerGuess,
    decreasePlayerGuess,
    canTogglePlayerDoesNotHaveSuit,
    togglePlayerDoesNotHaveSuit,
    resetPlayerGuess,
    aiModels,
    addAIPlayer,
    removeAIPlayer,
  } = useQuantumContext();

  // Derived state
  const showGuessEditor = currentUserPosition !== null;
  const canEditGuesses = Boolean(showGuessEditor && playerGuess && gameState);
  const playerHasJoined = currentUserPosition !== null;

  const hasActions =
    isCurrentUser ||
    (!isOccupiedByHuman && !isOccupiedByAI) ||
    isOccupiedByAI ||
    canEditGuesses;

  const canBeTargeted =
    gameState?.game_state === QuantumGameState.TARGET_PLAYER &&
    gameState?.current_player !== playerNumber &&
    isViewingPlayerActive &&
    playerHasJoined &&
    !gameState?.players_are_out.includes(playerNumber);

  const getStatusInfo = (): StatusInfo => {
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
      setSelectedTargetPlayer(playerNumber);
    } else if (isMobile && (hasActions || canEditGuesses)) {
      setIsGuessModelOpen(true);
    }
  };

  // Props for presenters
  const handDisplayProps: HandDisplayProps | undefined = gameState
    ? {
        gameState,
        playerNumber,
        canEditGuesses,
        playerGuess,
      }
    : undefined;

  const actionsProps: ActionsPresenterProps = {
    isCurrentUser,
    isOccupiedByHuman,
    isOccupiedByAI,
    aiModels: aiModels || {},
    isAIDropdownOpen,
    setIsAIDropdownOpen,
    onRemovePlayer: () => updateCurrentUserPosition(null),
    onMovePlayer: () => updateCurrentUserPosition(playerNumber),
    onAddAIPlayer: (model: string) => addAIPlayer(playerNumber, model),
    onRemoveAIPlayer: () => removeAIPlayer(playerNumber),
  };

  const guessEditorProps: GuessEditorProps | undefined =
    canEditGuesses && gameState && playerGuess
      ? {
          gameState,
          playerNumber,
          playerGuess,
          canIncreasePlayerGuess,
          increasePlayerGuess,
          canDecreasePlayerGuess,
          decreasePlayerGuess,
          canTogglePlayerDoesNotHaveSuit,
          togglePlayerDoesNotHaveSuit,
          resetPlayerGuess,
        }
      : undefined;

  const hintsProps = {
    statusInfo,
    isEmpty,
    canBeTargeted,
    playerHasJoined,
    isMobile,
    isHovered,
  };

  return (
    <>
      <QuantumPlayerCardPresenter
        playerName={playerName}
        isActive={isActive}
        statusInfo={statusInfo}
        hasActions={hasActions}
        canBeTargeted={canBeTargeted}
        isMobile={isMobile}
        isHovered={isHovered}
        setIsHovered={setIsHovered}
        setIsAIDropdownOpen={setIsAIDropdownOpen}
        onCardClick={handleCardClick}
        canEditGuesses={canEditGuesses}
        onOpenGuessEditor={() => setIsGuessModelOpen(true)}
        handDisplayProps={handDisplayProps}
        actionsPresenterProps={hasActions ? actionsProps : undefined}
        hintsProps={hintsProps}
      />

      <QuantumPlayerModalPresenter
        isOpen={isGuessModalOpen}
        onClose={() => setIsGuessModelOpen(false)}
        playerName={playerName}
        statusInfo={statusInfo}
        gameState={gameState}
        handDisplayProps={handDisplayProps}
        actionsProps={actionsProps}
        guessEditorProps={guessEditorProps}
      />
    </>
  );
}

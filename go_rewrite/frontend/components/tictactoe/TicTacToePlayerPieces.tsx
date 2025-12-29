import clsx from "clsx";
import { useState } from "react";
import { AddAI, Join, Leave, RemoveAI } from "@/components/common/Icons";
import { useIsMobile } from "@/context/BrowserContext";
import { useTicTacToePlayerContext } from "@/components/tictactoe/TicTacToeContext";
import { PlayerInfo } from "@/types/apiTypes";

type PlayerPieceProps = {
  playerId: number;
  playerInfo: PlayerInfo | null;
  isCurrentUser: boolean;
  aiModels: Record<string, string>;
  movePlayer: () => void;
  removePlayer: () => void;
  addAIPlayer: (model: string) => void;
  removeAIPlayer: () => void;
  isCurrentPlayerTurn: boolean;
};

function PlayerPiece({
  playerId,
  playerInfo,
  isCurrentUser,
  aiModels,
  movePlayer,
  removePlayer,
  addAIPlayer,
  removeAIPlayer,
  isCurrentPlayerTurn,
}: PlayerPieceProps) {
  const isMobile = useIsMobile();
  const [isHovered, setIsHovered] = useState(false);
  const [isMobileModalOpen, setIsMobileModalOpen] = useState(false);
  const [isAIDropdownOpen, setIsAIDropdownOpen] = useState(false);

  const isOccupiedByAI = playerInfo?.is_ai ?? false;
  const isOccupiedByHuman = playerInfo !== null && !isOccupiedByAI;
  const playerName = playerInfo?.display_name ?? null;

  const hasActions =
    isCurrentUser || (!isOccupiedByHuman && !isOccupiedByAI) || isOccupiedByAI;

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

  const renderDesktopHoverActions = () => {
    if (isMobile || !isHovered || !hasActions) return null;

    return (
      <div className="absolute inset-0 rounded-full flex items-center justify-center transition-all duration-200">
        <div className="flex flex-col gap-1 rounded-lg p-1 shadow-lg">
          {isCurrentUser && (
            <button
              onClick={removePlayer}
              className="p-1.5 bg-red-100 hover:bg-red-200 dark:bg-red-800 dark:hover:bg-red-700 text-red-600 dark:text-red-300 rounded-md transition-colors"
              title="Leave game"
            >
              <Leave size={16} />
            </button>
          )}

          {!isCurrentUser && !isOccupiedByHuman && !isOccupiedByAI && (
            <>
              <div className="relative">
                <button
                  onClick={() => setIsAIDropdownOpen(!isAIDropdownOpen)}
                  className="p-1.5 bg-yellow-200 hover:bg-yellow-400 dark:bg-yellow-700 dark:hover:bg-yellow-600 text-yellow-700 dark:text-yellow-200 rounded-md transition-colors"
                  title="Add AI player"
                >
                  <AddAI size={16} />
                </button>
                {isAIDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 shadow-lg rounded-lg border border-gray-200 dark:border-gray-600 z-50 min-w-24">
                    {Object.entries(aiModels).map(([key, name]) => (
                      <button
                        key={key}
                        onClick={() => {
                          addAIPlayer(key);
                          setIsAIDropdownOpen(false);
                        }}
                        className="block w-full text-left px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 text-xs first:rounded-t-lg last:rounded-b-lg"
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={movePlayer}
                className="p-1.5 bg-green-100 hover:bg-green-200 dark:bg-green-900 dark:hover:bg-green-800 text-green-600 dark:text-green-300 rounded-md transition-colors"
                title="Join game"
              >
                <Join size={16} />
              </button>
            </>
          )}

          {!isCurrentUser && isOccupiedByAI && (
            <button
              onClick={removeAIPlayer}
              className="p-1.5 bg-red-100 hover:bg-red-200 dark:bg-red-900 dark:hover:bg-red-800 text-red-600 dark:text-red-300 rounded-md transition-colors"
              title="Remove AI player"
            >
              <RemoveAI size={16} />
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderMobileModal = () => {
    if (!isMobile || !isMobileModalOpen || !hasActions) return null;
    const backgroundColor = "bg-gray-100 dark:bg-gray-800";

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div
          className={`${backgroundColor} rounded-xl p-6 max-w-sm w-full shadow-2xl border border-gray-200 dark:border-gray-600`}
        >
          {/* Current player info */}
          <div className="text-center mb-6">
            <div className="w-20 h-20 mx-auto mb-3 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center">
              <div className="w-16 h-16">
                <img
                  src={playerId === 0 ? "/cross.png" : "/nought.png"}
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
            <h3 className="text-lg font-semibold">
              {playerName || `${playerId === 0 ? "Cross" : "Nought"} Player`}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {statusInfo.label}
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-3">
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
            "absolute top-0 right-0 z-10",
            isMobile ? "opacity-80" : "opacity-60",
          )}
        >
          <div
            className={clsx(`w-3 h-3 rounded-full ${statusInfo.color}`, {
              "animate-ping": isEmpty,
            })}
          ></div>
        </div>
      </>
    );
  };

  const isLeftSide = playerId === 0; // Cross goes on left, Nought on right

  return (
    <>
      <div
        className={clsx("flex items-center gap-3", {
          "flex-row-reverse": isLeftSide, // Cross: name then icon
          "flex-row": !isLeftSide, // Nought: icon then name
        })}
      >
        {/* Player name */}
        {playerName && (
          <div className="text-lg sm:text-2xl font-medium text-gray-700 dark:text-gray-300 max-w-24 truncate">
            {playerName}
          </div>
        )}

        {/* Player piece */}
        <div
          className={clsx(
            "relative flex items-center justify-center transition-all duration-300 ease-in-out rounded-full",
            {
              // Base sizing - increased by 1.5x for larger screens
              "w-16 h-16 sm:w-24 sm:h-24": !isCurrentPlayerTurn,
              "w-18 h-18 sm:w-28 sm:h-28": isCurrentPlayerTurn,

              "cursor-pointer": hasActions,
              "hover:shadow-lg hover:scale-105": !isMobile && hasActions,
              "active:scale-95": isMobile && hasActions,
            },
          )}
          onMouseEnter={() => !isMobile && hasActions && setIsHovered(true)}
          onMouseLeave={() => {
            if (!isMobile) {
              setIsHovered(false);
              setIsAIDropdownOpen(false);
            }
          }}
          onClick={() => isMobile && hasActions && setIsMobileModalOpen(true)}
        >
          {renderDiscoverabilityHints()}

          <div
            className={clsx("transition-all duration-300", {
              // Base icon sizing - increased by 1.5x for larger screens
              "w-12 h-12 sm:w-20 sm:h-20": !isCurrentPlayerTurn,
              "w-14 h-14 sm:w-24 sm:h-24": isCurrentPlayerTurn,
              "animate-pulse": isCurrentPlayerTurn,
            })}
          >
            <img
              src={playerId === 0 ? "/cross.png" : "/nought.png"}
              className="w-full h-full object-contain"
            />
          </div>

          {renderDesktopHoverActions()}
        </div>
      </div>

      {renderMobileModal()}
    </>
  );
}

type TicTacToePlayerPiecesProps = {
  children: React.ReactNode;
};

export function TicTacToePlayerPieces({
  children,
}: TicTacToePlayerPiecesProps) {
  const {
    players,
    currentUserPosition,
    aiModels,
    currentPlayerNumber,
    updateCurrentUserPosition,
    removeAIPlayer,
    addAIPlayer,
  } = useTicTacToePlayerContext();

  const availablePlayers = [
    { id: 0, name: "Cross" },
    { id: 1, name: "Nought" },
  ];

  const renderPlayerPiece = (player: { id: number; name: string }) => {
    const isSelected = currentUserPosition === player.id;
    const playerInfo = players[player.id];
    const isCurrentPlayerTurn = player.id === currentPlayerNumber;

    return (
      <PlayerPiece
        key={player.id}
        playerId={player.id}
        playerInfo={playerInfo}
        isCurrentUser={isSelected}
        aiModels={aiModels}
        isCurrentPlayerTurn={isCurrentPlayerTurn}
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
  };

  return (
    <div className="relative">
      {/* Top row with player pieces */}
      <div className="flex justify-between items-center mb-4 px-8">
        {/* Cross on left */}
        {renderPlayerPiece(availablePlayers[0])}

        {/* Nought on right */}
        {renderPlayerPiece(availablePlayers[1])}
      </div>

      {/* Game board */}
      {children}
    </div>
  );
}

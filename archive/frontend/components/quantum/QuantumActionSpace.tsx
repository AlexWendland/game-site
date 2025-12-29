import { useState } from "react";
import clsx from "clsx";
import {
  useQuantumContext,
  QuantumGameState,
  QuantumGameStateData,
} from "./QuantumContext";
import { QuantumHintLevel } from "@/types/apiTypes";

// Presenter component - pure function for rendering
type QuantumActionSpacePresenterProps = {
  gameState: QuantumGameStateData | null;
  players: Record<number, string | null>;
  currentUserPosition: number | null;
  isMyTurn: boolean;
  mySuitName: string | null;

  // Local state
  newSuitName: string;
  setNewSuitName: (name: string) => void;
  selectedTargetPlayer: number | null;
  setSelectedTargetPlayer: (player: number | null) => void;
  selectedSuit: number | null;
  setSelectedSuit: (suit: number | null) => void;

  // Actions
  onSetSuitName: (name: string) => void;
  onTargetPlayer: (player: number, suit: number) => void;
  onRespondToTarget: (response: boolean) => void;
  onClaimNoWin: () => void;
  onClaimOwnSuit: (suit: number) => void;
  onClaimAllSuitsDetermined: () => void;
  isGuessValid: boolean;
};

export function QuantumActionSpacePresenter({
  gameState,
  players,
  currentUserPosition,
  isMyTurn,
  mySuitName,
  newSuitName,
  setNewSuitName,
  selectedTargetPlayer,
  setSelectedTargetPlayer,
  selectedSuit,
  setSelectedSuit,
  onSetSuitName,
  onTargetPlayer,
  onRespondToTarget,
  onClaimNoWin,
  onClaimOwnSuit,
  onClaimAllSuitsDetermined,
  isGuessValid,
}: QuantumActionSpacePresenterProps) {
  if (!gameState || currentUserPosition === null) {
    return (
      <div className="w-full max-w-[800px] bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
        <p className="text-center text-gray-500 dark:text-gray-400">
          Join the game to see actions
        </p>
      </div>
    );
  }

  // Handle setting suit name (initial action)
  const renderSuitNameInput = () => {
    if (mySuitName !== null) return null;

    return (
      <div className="space-y-3">
        <h3 className="text-lg font-bold text-center">Choose Your Suit Name</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
          You must choose a unique suit name before playing
        </p>
        <div className="flex space-x-2">
          <input
            type="text"
            value={newSuitName}
            onChange={(e) => setNewSuitName(e.target.value)}
            placeholder="Enter suit name (e.g. Dragons, Stars)"
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            maxLength={20}
          />
          <button
            onClick={() => {
              onSetSuitName(newSuitName);
              setNewSuitName("");
            }}
            disabled={!newSuitName.trim()}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-lg transition-colors"
          >
            Set
          </button>
        </div>
      </div>
    );
  };

  // Handle targeting a player
  const renderTargetPlayerAction = () => {
    if (gameState.game_state !== QuantumGameState.TARGET_PLAYER || !isMyTurn) {
      return null;
    }

    const availableSuits = gameState.available_moves as number[];

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-center">Target a Player</h3>

        {selectedTargetPlayer === null ? (
          <p className="text-center text-gray-600 dark:text-gray-400">
            Click on a player card to select who to target
          </p>
        ) : (
          <div className="space-y-3">
            <p className="text-center">
              Targeting:{" "}
              <span className="font-bold">
                {players[selectedTargetPlayer] ||
                  `Player ${selectedTargetPlayer}`}
              </span>
            </p>

            <div>
              <h4 className="text-sm font-bold mb-2">Select Suit:</h4>
              <div className="grid grid-cols-2 gap-2">
                {availableSuits.map((suit) => {
                  const suitName = gameState.suit_names[suit] || `Suit ${suit}`;
                  return (
                    <button
                      key={suit}
                      onClick={() => setSelectedSuit(suit)}
                      className={clsx(
                        "px-3 py-2 rounded-lg border transition-all truncate",
                        {
                          "bg-blue-300 border-blue-300 dark:bg-blue-500 dark:border-blue-500":
                            selectedSuit === suit,
                          "bg-gray-200 hover:bg-gray-300 hover:scale-y-110 dark:bg-gray-700 border-gray-300 dark:border-gray-600 dark:hover:bg-gray-600":
                            selectedSuit !== suit,
                        },
                      )}
                    >
                      {suitName}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-3">
              <button
                onClick={() => {
                  if (selectedTargetPlayer !== null && selectedSuit !== null) {
                    onTargetPlayer(selectedTargetPlayer, selectedSuit);
                    setSelectedTargetPlayer(null);
                    setSelectedSuit(null);
                  }
                }}
                disabled={selectedSuit === null}
                className="col-start-2 flex-1 px-4 py-2 bg-orange-400 hover:bg-orange-500 dark:bg-orange-600 dark:hover:bg-orange-500 disabled:bg-gray-400 hover:scale-105 rounded-lg transition-all"
              >
                Target
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Handle responding to a target
  const renderResponseAction = () => {
    if (gameState.game_state !== QuantumGameState.RESPONSE || !isMyTurn) {
      return null;
    }

    const targetingPlayer = gameState.current_player;
    const targetedSuit = gameState.current_target_suit;
    const targetingPlayerName =
      targetingPlayer !== null
        ? players[targetingPlayer] || `Player ${targetingPlayer}`
        : "Unknown";
    const suitName =
      targetedSuit !== null
        ? gameState.suit_names[targetedSuit] || `Suit ${targetedSuit}`
        : "Unknown";
    const availableResponses = gameState.available_moves as boolean[];
    const isTrueAvailable = availableResponses.includes(true);
    const isFalseAvailable = availableResponses.includes(false);

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-center">Respond to Target</h3>
        <p className="text-center">
          <span className="font-bold">{targetingPlayerName}</span> asked you for{" "}
          <span className="font-bold">{suitName}</span>
        </p>

        <div className="grid grid-cols-2 gap-4">
          <button
            disabled={!isTrueAvailable}
            onClick={() => onRespondToTarget(true)}
            className="px-6 py-3 rounded-lg font-bold transition-all bg-green-400 hover:bg-green-500 dark:bg-green-600 dark:hover:bg-green-500 disabled:bg-gray-400 disabled:opacity-50 hover:scale-105 disabled:hover:scale-100"
          >
            Yes
          </button>
          <button
            disabled={!isFalseAvailable}
            onClick={() => onRespondToTarget(false)}
            className="px-6 py-3 rounded-lg font-bold transition-tall hover:scale-105 disabled:hover:scale-100 bg-red-500 hover:bg-red-600 disabled:bg-gray-400 disabled:opacity-50"
          >
            No
          </button>
        </div>
      </div>
    );
  };

  // Handle claiming victory
  const renderClaimVictoryAction = () => {
    if (gameState.game_state !== QuantumGameState.CLAIM_WIN || !isMyTurn) {
      return null;
    }

    const availableSuits = gameState.available_moves as number[];

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-center">Claim Victory</h3>

        <div className="space-y-3 ">
          <div className="sm:grid sm:grid-cols-3">
            <button
              onClick={() => onClaimNoWin()}
              className="sm:col-start-2 w-full px-4 py-3 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 rounded-full transition-colors"
            >
              I can not win currently
            </button>
          </div>

          <div>
            <h4 className="text-sm font-bold mb-2">
              Or claim you own a complete suit:
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {availableSuits.map((suit) => {
                const suitName = gameState.suit_names[suit] || `Suit ${suit}`;
                return (
                  <button
                    key={suit}
                    onClick={() => onClaimOwnSuit(suit)}
                    className="px-3 py-2 bg-yellow-400 hover:bg-yellow-500 dark:bg-yellow-700 dark:hover:bg-yellow-600 rounded-full transition-colors"
                  >
                    Own all {suitName}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold mb-2">
              Or say you know where all the cards are:
            </h4>
            <div className="sm:grid-cols-3 sm:grid">
              <button
                onClick={() => onClaimAllSuitsDetermined()}
                disabled={!isGuessValid}
                className="sm:col-start-2 w-full py-3 bg-orange-400 hover:bg-orange-500 dark:bg-orange-600 dark:hover:bg-orange-500 disabled:bg-gray-300 disabled:dark:bg-gray-500 disabled:opacity-50 rounded-full transition-colors"
                title={
                  isGuessValid
                    ? "Submit your guess as the final allocation"
                    : "Your guess must be valid to claim all suits are determined"
                }
              >
                {isGuessValid ? "Submit your guess" : "Make a valid guess"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const isGameFinished = gameState.game_state === QuantumGameState.FINISHED;

  return (
    <div className="w-full max-w-[800px] bg-gray-100 dark:bg-gray-800 rounded-lg p-4 space-y-4">
      {isGameFinished ? (
        <div className="text-center">
          <h3 className="text-lg font-bold">Game Finished!</h3>
          {gameState.winner !== null && (
            <p className="text-green-600 dark:text-green-400 font-bold">
              Winner:{" "}
              {players[gameState.winner] || `Player ${gameState.winner}`}
            </p>
          )}
        </div>
      ) : (
        <>
          {renderSuitNameInput()}

          {mySuitName && (
            <>
              {renderTargetPlayerAction()}
              {renderResponseAction()}
              {renderClaimVictoryAction()}

              {!isMyTurn && (
                <div className="text-center text-gray-600 dark:text-gray-400">
                  <p>Waiting for other players...</p>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

// Container component - handles state and data
export function QuantumActionSpace({
  selectedTargetPlayer: externalSelectedTargetPlayer,
  setSelectedTargetPlayer: externalSetSelectedTargetPlayer,
}: {
  selectedTargetPlayer?: number | null;
  setSelectedTargetPlayer?: (player: number | null) => void;
} = {}) {
  const {
    gameState,
    players,
    currentUserPosition,
    setSuitName,
    targetPlayer,
    respondToTarget,
    claimNoWin,
    claimOwnSuit,
    submitGuessAsAllSuitsDetermined,
    isGuessValid,
  } = useQuantumContext();

  // Local state for actions
  const [newSuitName, setNewSuitName] = useState("");
  const [internalSelectedTargetPlayer, setInternalSelectedTargetPlayer] =
    useState<number | null>(null);
  const [selectedSuit, setSelectedSuit] = useState<number | null>(null);

  // Use external or internal state for selected target player
  const selectedTargetPlayer =
    externalSelectedTargetPlayer ?? internalSelectedTargetPlayer;
  const setSelectedTargetPlayer =
    externalSetSelectedTargetPlayer ?? setInternalSelectedTargetPlayer;

  if (!gameState || currentUserPosition === null) {
    return (
      <QuantumActionSpacePresenter
        gameState={null}
        players={players}
        currentUserPosition={null}
        isMyTurn={false}
        mySuitName={null}
        newSuitName={newSuitName}
        setNewSuitName={setNewSuitName}
        selectedTargetPlayer={selectedTargetPlayer}
        setSelectedTargetPlayer={setSelectedTargetPlayer}
        selectedSuit={selectedSuit}
        setSelectedSuit={setSelectedSuit}
        onSetSuitName={setSuitName}
        onTargetPlayer={targetPlayer}
        onRespondToTarget={respondToTarget}
        onClaimNoWin={claimNoWin}
        onClaimOwnSuit={claimOwnSuit}
        onClaimAllSuitsDetermined={() => submitGuessAsAllSuitsDetermined()}
        isGuessValid={isGuessValid()}
      />
    );
  }

  const isMyTurn =
    gameState.game_state === QuantumGameState.RESPONSE
      ? gameState.current_target_player === currentUserPosition
      : gameState.current_player === currentUserPosition;
  const mySuitName = gameState.suit_names[currentUserPosition];

  return (
    <QuantumActionSpacePresenter
      gameState={gameState}
      players={players}
      currentUserPosition={currentUserPosition}
      isMyTurn={isMyTurn}
      mySuitName={mySuitName}
      newSuitName={newSuitName}
      setNewSuitName={setNewSuitName}
      selectedTargetPlayer={selectedTargetPlayer}
      setSelectedTargetPlayer={setSelectedTargetPlayer}
      selectedSuit={selectedSuit}
      setSelectedSuit={setSelectedSuit}
      onSetSuitName={setSuitName}
      onTargetPlayer={targetPlayer}
      onRespondToTarget={respondToTarget}
      onClaimNoWin={claimNoWin}
      onClaimOwnSuit={claimOwnSuit}
      onClaimAllSuitsDetermined={() => submitGuessAsAllSuitsDetermined()}
      isGuessValid={isGuessValid()}
    />
  );
}

"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  ReactNode,
  useMemo,
  useCallback,
} from "react";
import {
  getGameWebsocket,
  leavePlayerPosition,
  parseWebSocketMessage,
  setPlayerNameWebsocket,
  setPlayerPosition,
  addAIPlayerOverWebsocket,
  removeAIPlayerOverWebsocket,
} from "@/lib/websocketFunctions";
import { useToast } from "@/context/ToastContext";
import { usePathname } from "next/navigation";
import { useGameContext } from "@/context/GameContext";
import { getUserName } from "@/context/UserContext";
import { getGameMetadata, getGameModels } from "@/lib/apiCalls";
import { QuantumHintLevel, QuantumGameMetadata } from "@/types/apiTypes";
import {
  safeHandCopy,
  canIncreasePlayerGuess,
  canDecreasePlayerGuess,
  canTogglePlayerDoesNotHaveSuit,
  isGuessValid,
  convertGuessToSuitAllocation,
  updatePlayerGuessFromGameState,
} from "./quantumGameUtils";

// Enums matching backend
export enum QuantumGameState {
  TARGET_PLAYER = "target_player",
  RESPONSE = "response",
  CLAIM_WIN = "claim_win",
  FINISHED = "finished",
}

export enum QuantumActionOutcome {
  SUCCESS = "success",
  WON = "won",
  CONTRADICTION_CONTINUE = "contradiction_continue",
  CONTRADICTION_REVERTED = "contradiction_reverted",
}

// Types matching backend models
export interface QuantumLogEntry {
  player: number;
  function_call: string;
  parameters: Record<string, any>;
  outcome: QuantumActionOutcome;
  move_number: number;
}

export interface QuantumHandState {
  suits: Record<number, number>;
  does_not_have_suit: number[];
  total_cards: number;
}

export interface QuantumGameStateData {
  // Game state
  game_log: QuantumLogEntry[];
  hint_levels: Record<number, QuantumHintLevel>;
  suit_names: Record<number, string | null>;
  contradiction_count: Record<number, number>;

  // Logic state
  history: Record<number, QuantumHandState>[];
  winner: number | null;
  game_state: QuantumGameState;
  current_player: number;
  move_number: number;
  current_target_player: number | null;
  current_target_suit: number | null;
  current_hands: Record<number, QuantumHandState>;
  available_moves: (boolean | number)[];
  players_are_out: number[];
}

type QuantumContextType = {
  gameState: QuantumGameStateData | null;

  // Player management
  players: Record<number, string | null>;
  aiPlayers: Record<number, string>;
  currentUserPosition: number | null;
  aiModels: Record<string, string>;
  maxPlayers: number;
  maxHintLevel: QuantumHintLevel;

  status: string;

  // Actions
  updateCurrentUserPosition: (newPosition: number | null) => Promise<void>;
  removeAIPlayer: (position: number) => Promise<void>;
  addAIPlayer: (position: number, model: string) => Promise<void>;
  setCurrentUserPosition: (position: number | null) => void;

  // Game actions
  setSuitName: (suitName: string) => void;
  setHintLevel: (hintLevel: QuantumHintLevel) => void;
  targetPlayer: (targetedPlayer: number, suit: number) => void;
  respondToTarget: (response: boolean) => void;
  claimNoWin: () => void;
  claimOwnSuit: (suit: number) => void;

  // Player guess management
  playerGuess: Record<number, QuantumHandState>;
  canIncreasePlayerGuess: (player: number, suit: number) => boolean;
  increasePlayerGuess: (player: number, suit: number) => void;
  canDecreasePlayerGuess: (player: number, suit: number) => boolean;
  decreasePlayerGuess: (player: number, suit: number) => void;
  canTogglePlayerDoesNotHaveSuit: (player: number, suit: number) => boolean;
  togglePlayerDoesNotHaveSuit: (player: number, suit: number) => void;
  resetPlayerGuess: (player: number) => void;
  isGuessValid: () => boolean;
  submitGuessAsAllSuitsDetermined: () => void;
};

const QuantumContext = createContext<QuantumContextType | null>(null);

export const useQuantumContext = () => {
  const context = useContext(QuantumContext);
  if (!context) {
    throw new Error("useQuantumContext must be used within a QuantumProvider");
  }
  return context;
};

// WebSocket helper functions
function setSuitNameOverWebsocket(
  webSocket: WebSocket | null,
  suitName: string,
): void {
  if (!webSocket) return;
  webSocket.send(
    JSON.stringify({
      request_type: "game",
      function_name: "set_suit_name",
      parameters: { suit_name: suitName },
    }),
  );
}

function setHintLevelOverWebsocket(
  webSocket: WebSocket | null,
  hintLevel: QuantumHintLevel,
): void {
  if (!webSocket) return;
  webSocket.send(
    JSON.stringify({
      request_type: "game",
      function_name: "set_hint_level",
      parameters: { hint_level: hintLevel },
    }),
  );
}

function targetPlayerOverWebsocket(
  webSocket: WebSocket | null,
  targetedPlayer: number,
  suit: number,
): void {
  if (!webSocket) return;
  webSocket.send(
    JSON.stringify({
      request_type: "game",
      function_name: "target_player",
      parameters: { targeted_player: targetedPlayer, suit },
    }),
  );
}

function respondToTargetOverWebsocket(
  webSocket: WebSocket | null,
  response: boolean,
): void {
  if (!webSocket) return;
  webSocket.send(
    JSON.stringify({
      request_type: "game",
      function_name: "respond_to_target",
      parameters: { response },
    }),
  );
}

function claimNoWinOverWebsocket(webSocket: WebSocket | null): void {
  if (!webSocket) return;
  webSocket.send(
    JSON.stringify({
      request_type: "game",
      function_name: "claim_no_win",
      parameters: {},
    }),
  );
}

function claimOwnSuitOverWebsocket(
  webSocket: WebSocket | null,
  suit: number,
): void {
  if (!webSocket) return;
  webSocket.send(
    JSON.stringify({
      request_type: "game",
      function_name: "claim_own_suit",
      parameters: { suit },
    }),
  );
}

function claimAllSuitsDeterminedOverWebsocket(
  webSocket: WebSocket | null,
  suitAllocation: Record<number, Record<number, number>>,
): void {
  if (!webSocket) return;
  webSocket.send(
    JSON.stringify({
      request_type: "game",
      function_name: "claim_all_suits_determined",
      parameters: { suit_allocation: suitAllocation },
    }),
  );
}

function parseQuantumGameState(
  parameters: Record<string, any>,
): QuantumGameStateData {
  const {
    game_log,
    hint_levels,
    suit_names,
    contradiction_count,
    history,
    winner,
    game_state,
    current_player,
    move_number,
    current_target_player,
    current_target_suit,
    current_hands,
    available_moves,
    players_are_out,
  } = parameters;

  if (
    !Array.isArray(game_log) ||
    typeof hint_levels !== "object" ||
    typeof suit_names !== "object" ||
    !Array.isArray(history) ||
    typeof game_state !== "string" ||
    typeof current_player !== "number" ||
    typeof move_number !== "number" ||
    typeof current_hands !== "object" ||
    !Array.isArray(available_moves) ||
    !Array.isArray(players_are_out)
  ) {
    console.error("Invalid quantum game state structure:", parameters);
    throw new Error("Invalid quantum game state structure");
  }
  return {
    game_log,
    hint_levels,
    suit_names,
    contradiction_count,
    history,
    winner,
    game_state: game_state as QuantumGameState,
    current_player,
    move_number,
    current_target_player,
    current_target_suit,
    current_hands,
    available_moves,
    players_are_out,
  };
}

export function QuantumProvider({
  gameID,
  children,
}: {
  gameID: string;
  children: ReactNode;
}) {
  // State
  const [gameState, setGameState] = useState<QuantumGameStateData | null>(null);
  const [players, setPlayers] = useState<Record<number, string | null>>({});
  const [aiModels, setAIModels] = useState<Record<string, string>>({});
  const [aiPlayers, setAIPlayers] = useState<Record<number, string>>({});
  const [currentUserPosition, setCurrentUserPosition] = useState<number | null>(
    null,
  );
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [maxHintLevel, setMaxHintLevel] = useState<QuantumHintLevel>(
    QuantumHintLevel.NONE,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState<string>("Loading...");
  const [playerGuess, setPlayerGuess] = useState<
    Record<number, QuantumHandState>
  >({});
  const [playerGuessLastLogIndex, setPlayerGuessLastLogIndex] =
    useState<number>(0);

  // WebSocket
  const gameWebSocket = useRef<WebSocket | null>(null);
  const { addToast } = useToast();
  const username = getUserName();

  // Game context integration
  const {
    setGameCode,
    setGameLink,
    setGameState: setGlobalGameState,
    clearGame,
  } = useGameContext();
  const pathname = usePathname();

  // WebSocket connection
  useEffect(() => {
    let isMounted = true;

    const connectWebSocket = async () => {
      try {
        const webSocket = await getGameWebsocket(gameID);
        if (username) {
          setPlayerNameWebsocket(username, webSocket);
        }
        setIsLoading(false);

        if (!isMounted) return;

        gameWebSocket.current = webSocket;
        webSocket.addEventListener("message", (event) => {
          try {
            const parsedMessage = parseWebSocketMessage(event);

            switch (parsedMessage.message_type) {
              case "session_state":
                setCurrentUserPosition(parsedMessage.parameters.user_position);
                setPlayers(parsedMessage.parameters.player_positions);
                break;

              case "ai_players":
                setAIPlayers(parsedMessage.parameters.ai_players);
                break;

              case "error":
                addToast({
                  type: "error",
                  message: parsedMessage.parameters.error_message,
                });
                break;

              case "game_state": {
                const quantumGameState = parseQuantumGameState(
                  parsedMessage.parameters,
                );
                setGameState(quantumGameState);
                break;
              }

              case "simple":
                console.log(parsedMessage.parameters.message);
                break;

              case "unknown":
              default:
                break;
            }
          } catch (err) {
            console.error("Error processing message:", err);
          }
        });

        webSocket.addEventListener("close", () => {
          console.log("WebSocket disconnected");
        });

        webSocket.addEventListener("error", (error) => {
          console.error("WebSocket error:", error);
        });
      } catch (err) {
        console.error("Failed to connect WebSocket:", err);
      }
    };

    connectWebSocket();

    return () => {
      isMounted = false;
      if (gameWebSocket.current) {
        gameWebSocket.current.close();
        gameWebSocket.current = null;
      }
    };
  }, [gameID, username]);

  // Update status based on game state
  useEffect(() => {
    if (!gameState) {
      setStatus("Loading...");
      return;
    }

    if (gameState.winner !== null) {
      const winnerName =
        players[gameState.winner] || `Player ${gameState.winner}`;
      setStatus(`Winner: ${winnerName}`);
      return;
    }

    const currentPlayerName =
      players[gameState.current_player] || `Player ${gameState.current_player}`;
    const currentTargetPlayerName =
      gameState.current_target_player === null
        ? "Unknown"
        : players[gameState.current_target_player] ||
          `Player ${gameState.current_target_player}`;

    switch (gameState.game_state) {
      case QuantumGameState.TARGET_PLAYER:
        setStatus(`${currentPlayerName}'s turn to target a player`);
        break;
      case QuantumGameState.RESPONSE:
        setStatus(`${currentTargetPlayerName}'s turn to respond`);
        break;
      case QuantumGameState.CLAIM_WIN:
        setStatus(`${currentPlayerName} can claim victory`);
        break;
      case QuantumGameState.FINISHED:
        setStatus("Game finished");
        break;
      default:
        setStatus("Game in progress");
    }
  }, [gameState, players]);

  // Fetch metadata
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const metadata = (await getGameMetadata(gameID)) as QuantumGameMetadata;
        setMaxPlayers(metadata.max_players);
        setMaxHintLevel(metadata.parameters.max_hint_level);
      } catch (error) {
        console.error("Failed to fetch metadata:", error);
      }
    };
    fetchMetadata();
  }, [gameID]);

  // Fetch AI models
  useEffect(() => {
    const fetchAIModels = async () => {
      try {
        const models = await getGameModels(gameID);
        setAIModels(models);
      } catch (error) {
        console.error("Failed to fetch AI models:", error);
      }
    };
    fetchAIModels();
  }, [gameID]);

  // Set game details in global context
  useEffect(() => {
    setGameCode(gameID);
    setGameLink(pathname);
    setGlobalGameState("Pending game start");
    return () => {
      clearGame();
    };
  }, [gameID]);

  // Update global game state
  useEffect(() => {
    if (gameState === null) {
      setGlobalGameState("Loading...");
    } else if (gameState.winner !== null) {
      setGlobalGameState("Game over");
    } else {
      setGlobalGameState("In game");
    }
  }, [gameState]);

  const canSetSuitName = useMemo(() => {
    if (gameState === null) return false;
    if (currentUserPosition === null) return false;
    return gameState.suit_names[currentUserPosition] === null;
  }, [gameState, currentUserPosition]);

  // Action functions
  const updateCurrentUserPosition = async (newPosition: number | null) => {
    if (newPosition === null) {
      leavePlayerPosition(gameWebSocket.current);
      setCurrentUserPosition(null);
    } else {
      setPlayerPosition(newPosition, gameWebSocket.current);
    }
  };

  const removeAIPlayer = async (position: number) => {
    removeAIPlayerOverWebsocket(gameWebSocket.current, position);
  };

  const addAIPlayer = async (position: number, model: string) => {
    addAIPlayerOverWebsocket(gameWebSocket.current, position, model);
  };

  const setSuitName = (suitName: string) => {
    if (!canSetSuitName) return;
    setSuitNameOverWebsocket(gameWebSocket.current, suitName);
  };

  const setHintLevel = (hintLevel: QuantumHintLevel) => {
    setHintLevelOverWebsocket(gameWebSocket.current, hintLevel);
  };

  const targetPlayer = (targetedPlayer: number, suit: number) => {
    targetPlayerOverWebsocket(gameWebSocket.current, targetedPlayer, suit);
  };

  const respondToTarget = (response: boolean) => {
    respondToTargetOverWebsocket(gameWebSocket.current, response);
  };

  const claimNoWin = () => {
    claimNoWinOverWebsocket(gameWebSocket.current);
  };

  const claimOwnSuit = (suit: number) => {
    claimOwnSuitOverWebsocket(gameWebSocket.current, suit);
  };

  const claimAllSuitsDetermined = (
    suitAllocation: Record<number, Record<number, number>>,
  ) => {
    claimAllSuitsDeterminedOverWebsocket(gameWebSocket.current, suitAllocation);
  };

  // Functions for changing player guesses
  useEffect(() => {
    if (gameState === null) return;
    if (currentUserPosition === null) {
      // Set player guess empty so it will reset.
      setPlayerGuess({});
      return;
    }

    if (Object.keys(playerGuess).length === 0) {
      setPlayerGuess(safeHandCopy(gameState.current_hands));
      setPlayerGuessLastLogIndex(gameState.game_log.length);
      return;
    }

    if (gameState.game_log.length === playerGuessLastLogIndex) return;

    const { updatedGuess, newLogIndex } = updatePlayerGuessFromGameState(
      playerGuess,
      gameState,
      currentUserPosition,
      playerGuessLastLogIndex,
    );

    setPlayerGuess(updatedGuess);
    setPlayerGuessLastLogIndex(newLogIndex);
  }, [gameState]);

  // Separate effect to sync playerGuess with gameState constraints
  useEffect(() => {
    if (gameState === null || Object.keys(playerGuess).length === 0) return;

    let needsUpdate = false;
    // Bit of a hack
    const newPlayerGuess = JSON.parse(JSON.stringify(playerGuess)) as Record<
      number,
      QuantumHandState
    >;

    // Update player guesses based on current game state constraints
    for (const playerNum in playerGuess) {
      const player = parseInt(playerNum);
      const currentHand = gameState.current_hands[player];
      if (!currentHand) continue;

      // Sync suits that the game state says they don't have
      for (const suit of currentHand.does_not_have_suit) {
        if (!newPlayerGuess[player].does_not_have_suit.includes(suit)) {
          newPlayerGuess[player].does_not_have_suit.push(suit);
          newPlayerGuess[player].suits[suit] = 0;
          needsUpdate = true;
        }
      }
      for (const suit in newPlayerGuess[player].suits) {
        if (suit === "-1") continue;
        if (
          (newPlayerGuess[player].suits[suit] || 0) <
          (gameState.current_hands[player].suits[suit] || 0)
        ) {
          newPlayerGuess[player].suits[suit] =
            gameState.current_hands[player].suits[suit] || 0;
          needsUpdate = true;
        }
      }
      for (const suit in gameState.current_hands[player].suits) {
        if (suit === "-1") continue;
        const suitMax =
          (gameState.current_hands[player].suits[suit] || 0) +
          (gameState.current_hands[player].suits["-1"] || 0);

        if ((newPlayerGuess[player].suits[suit] || 0) > suitMax) {
          newPlayerGuess[player].suits[suit] = suitMax;
          needsUpdate = true;
        }
      }
    }
    if (needsUpdate) {
      setPlayerGuess(newPlayerGuess);
    }
  }, [gameState]);

  const canIncreasePlayerGuessWrapper = useCallback(
    (player: number, suit: number): boolean => {
      if (gameState === null || currentUserPosition === null) return false;
      const playerHintLevel = gameState.hint_levels[currentUserPosition];

      // If the player has full hints, they shouldn't change the guess.
      if (playerHintLevel === QuantumHintLevel.FULL) return false;

      // Don't allow increasing if current hands show player doesn't have suit
      if (gameState.current_hands[player].does_not_have_suit.includes(suit))
        return false;

      return canIncreasePlayerGuess(
        playerGuess,
        gameState.current_hands,
        player,
        suit,
      );
    },
    [gameState, currentUserPosition, playerGuess],
  );

  const increasePlayerGuessWrapper = useCallback(
    (player: number, suit: number): void => {
      if (!canIncreasePlayerGuessWrapper(player, suit)) return;
      setPlayerGuess((prev) => {
        const newGuess = JSON.parse(JSON.stringify(prev));
        newGuess[player].suits[suit] = (newGuess[player].suits[suit] || 0) + 1;
        return newGuess;
      });
    },
    [canIncreasePlayerGuessWrapper],
  );

  const canDecreasePlayerGuessWrapper = useCallback(
    (player: number, suit: number): boolean => {
      if (gameState === null || currentUserPosition === null) return false;
      const playerHintLevel = gameState.hint_levels[currentUserPosition];

      // If the player has full hints, they shouldn't change the guess.
      if (playerHintLevel === QuantumHintLevel.FULL) return false;

      // Don't allow decreasing if current hands show player doesn't have suit
      if (gameState.current_hands[player].does_not_have_suit.includes(suit))
        return false;

      return canDecreasePlayerGuess(
        playerGuess,
        gameState.current_hands,
        player,
        suit,
      );
    },
    [gameState, currentUserPosition, playerGuess],
  );

  const decreasePlayerGuessWrapper = useCallback(
    (player: number, suit: number): void => {
      if (!canDecreasePlayerGuessWrapper(player, suit)) return;
      setPlayerGuess((prev) => {
        const newGuess = JSON.parse(JSON.stringify(prev));
        newGuess[player].suits[suit] = Math.max(
          0,
          (newGuess[player].suits[suit] || 0) - 1,
        );
        return newGuess;
      });
    },
    [canDecreasePlayerGuessWrapper],
  );

  const canTogglePlayerDoesNotHaveSuitWrapper = useCallback(
    (player: number, suit: number): boolean => {
      if (gameState === null || currentUserPosition === null) return false;
      const playerHintLevel = gameState.hint_levels[currentUserPosition];
      if (playerHintLevel === QuantumHintLevel.FULL) return false;

      return canTogglePlayerDoesNotHaveSuit(
        playerGuess,
        gameState.current_hands,
        player,
        suit,
      );
    },
    [gameState, currentUserPosition, playerGuess],
  );

  const togglePlayerDoesNotHaveSuitWrapper = useCallback(
    (player: number, suit: number): void => {
      if (!canTogglePlayerDoesNotHaveSuitWrapper(player, suit)) return;
      setPlayerGuess((prev) => {
        const newGuess = JSON.parse(JSON.stringify(prev));
        const doesNotHave = newGuess[player].does_not_have_suit;

        if (doesNotHave.includes(suit)) {
          // Remove from does_not_have_suit
          newGuess[player].does_not_have_suit = doesNotHave.filter(
            (s: number) => s !== suit,
          );
        } else {
          // Add to does_not_have_suit and set cards to 0
          newGuess[player].does_not_have_suit = [...doesNotHave, suit];
          newGuess[player].suits[suit] = 0;
        }
        return newGuess;
      });
    },
    [canTogglePlayerDoesNotHaveSuitWrapper],
  );

  const resetPlayerGuessWrapper = useCallback(
    (player: number): void => {
      if (gameState === null || currentUserPosition === null) return;
      setPlayerGuess((prev) => {
        const newGuess = JSON.parse(JSON.stringify(prev));
        newGuess[player] = safeHandCopy(gameState.current_hands)[player];
        return newGuess;
      });
    },
    [gameState, currentUserPosition],
  );

  const isGuessValidWrapper = useCallback((): boolean => {
    if (gameState === null || !playerGuess) return false;
    return isGuessValid(playerGuess, gameState.current_hands);
  }, [gameState, playerGuess]);

  const submitGuessAsAllSuitsDetermined = useCallback((): void => {
    if (!isGuessValidWrapper()) {
      addToast({
        type: "error",
        message:
          "Invalid guess: Check that all suits have 4 cards and each player has the correct total.",
      });
      return;
    }

    const suitAllocation = convertGuessToSuitAllocation(playerGuess);
    claimAllSuitsDetermined(suitAllocation);
  }, [isGuessValidWrapper, playerGuess, addToast]);

  const contextValue = useMemo(
    () => ({
      gameState,
      players,
      aiPlayers,
      currentUserPosition,
      aiModels,
      maxPlayers,
      maxHintLevel,
      status,
      updateCurrentUserPosition,
      removeAIPlayer,
      addAIPlayer,
      setSuitName,
      setHintLevel,
      targetPlayer,
      respondToTarget,
      claimNoWin,
      claimOwnSuit,
      playerGuess,
      setCurrentUserPosition,
      canIncreasePlayerGuess: canIncreasePlayerGuessWrapper,
      increasePlayerGuess: increasePlayerGuessWrapper,
      canDecreasePlayerGuess: canDecreasePlayerGuessWrapper,
      decreasePlayerGuess: decreasePlayerGuessWrapper,
      canTogglePlayerDoesNotHaveSuit: canTogglePlayerDoesNotHaveSuitWrapper,
      togglePlayerDoesNotHaveSuit: togglePlayerDoesNotHaveSuitWrapper,
      resetPlayerGuess: resetPlayerGuessWrapper,
      isGuessValid: isGuessValidWrapper,
      submitGuessAsAllSuitsDetermined,
    }),
    [
      gameState,
      players,
      aiPlayers,
      currentUserPosition,
      aiModels,
      maxPlayers,
      maxHintLevel,
      status,
      updateCurrentUserPosition,
      removeAIPlayer,
      addAIPlayer,
      setSuitName,
      setHintLevel,
      targetPlayer,
      respondToTarget,
      claimNoWin,
      claimOwnSuit,
      playerGuess,
      canIncreasePlayerGuessWrapper,
      increasePlayerGuessWrapper,
      canDecreasePlayerGuessWrapper,
      decreasePlayerGuessWrapper,
      canTogglePlayerDoesNotHaveSuitWrapper,
      togglePlayerDoesNotHaveSuitWrapper,
      resetPlayerGuessWrapper,
      isGuessValidWrapper,
      submitGuessAsAllSuitsDetermined,
    ],
  );

  if (isLoading) {
    return <div>Loading game...</div>;
  }

  return (
    <QuantumContext.Provider value={contextValue}>
      {children}
    </QuantumContext.Provider>
  );
}

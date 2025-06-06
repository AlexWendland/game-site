"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useMemo,
  ReactNode,
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
import { addToast } from "@heroui/react";
import { usePathname } from "next/navigation";
import { useGameContext } from "@/context/GameContext";
import { getUserName } from "@/context/UserContext";
import { getGameMetadata, getGameModels } from "@/lib/apiCalls";
import { WizardGameMetadata } from "@/types/apiTypes";
import { RoundPhase, RoundResult, TrickRecord } from "@/types/gameTypes";

type WizardBoardContextType = {
  numberOfPlayers: number;
  playerNames: Record<number, string | null>;
  playerBids: Record<number, number>;
  playerTricks: Record<number, number>;
  playerScores: Record<number, number>;
  activePlayer: number;
  viewingPlayer: number;
  trickCards: Record<number, number | null>;
  trickWinner: number | null;
  trickLeader: number | null;
  trumpCard: number | null;
  trumpSuit: number | null;
};

type WizardGameContextType = {
  status: string;
  currentMinTrick: number;
  currentTrickNumber: number;
  currentViewedTrick: number;
  setCurrentViewedTrick: (trickNumber: number) => void;
};

type WizardPlayerContextType = {
  players: Record<number, string | null>;
  maxPlayers: number;
  aiPlayers: Record<number, string>;
  currentUserPosition: number | null;
  aiModels: Record<string, string>;
  updateCurrentUserPosition: (newPosition: number | null) => Promise<void>;
  removeAIPlayer: (position: number) => Promise<void>;
  addAIPlayer: (position: number, model: string) => Promise<void>;
};

type WizardCardSelectionContextType = {
  allCards: number[];
  playableCards: number[];
  trumpSuit: number;
  playCard: (card: number) => void;
};

type WizardBidSelectionContextType = {
  validBids: number[];
  roundNumber: number;
  selectSuit: boolean;
  makeBid: (value: number, suit: number | null) => void;
};

type WizardScoreSheetContextType = {
  scoreSheet: Record<number, Record<number, RoundResult>>;
  roundNumber: number;
  maxRounds: number;
  roundBids: Record<number, number>;
  players: Record<number, string | null>;
  maxPlayers: number;
  totalScore: Record<number, number>;
};

export type WizardGameState = {
  // Global state
  score_sheet: Record<number, Record<number, RoundResult>>;
  winners: number[];
  scores: Record<number, number>;
  round_number: number;

  // Round state
  round_state: RoundPhase;
  visible_cards: Record<number, number[]>;
  round_bids: Record<number, number>;
  trick_count: Record<number, number>;
  trick_records: Record<number, TrickRecord>;
  trump_card: number;
  trump_suit: number;
  trump_to_be_set: boolean;

  // Trick state
  playable_cards: number[];
  valid_bids: number[];
  current_player: number;
  current_trick: Record<number, number>;
  max_round_number: number;
  current_trick_number: number;
  current_leading_player: number;
};

export function parseWizardGameState(
  parameters: Record<string, any>,
): WizardGameState {
  const {
    score_sheet,
    winners,
    scores,
    round_number,
    round_state,
    visible_cards,
    round_bids,
    trick_count,
    trick_records,
    trump_card,
    trump_suit,
    trump_to_be_set,
    playable_cards,
    valid_bids,
    current_player,
    current_trick,
    max_round_number,
    current_trick_number,
    current_leading_player,
  } = parameters;

  if (
    typeof score_sheet !== "object" ||
    !Array.isArray(winners) ||
    typeof scores !== "object" ||
    typeof round_number !== "number" ||
    typeof round_state !== "string" ||
    typeof visible_cards !== "object" ||
    typeof round_bids !== "object" ||
    typeof trick_count !== "object" ||
    typeof trick_records !== "object" ||
    typeof trump_card !== "number" ||
    typeof trump_suit !== "number" ||
    typeof trump_to_be_set !== "boolean" ||
    !Array.isArray(playable_cards) ||
    !Array.isArray(valid_bids) ||
    typeof current_player !== "number" ||
    typeof current_trick !== "object" ||
    typeof max_round_number !== "number" ||
    typeof current_trick_number !== "number" ||
    typeof current_leading_player !== "number"
  ) {
    console.error("Invalid wizard game state structure:", parameters);
    throw new Error("Invalid structure");
  }

  return {
    score_sheet,
    winners,
    scores,
    round_number,
    round_state: RoundPhase[round_state as keyof typeof RoundPhase],
    visible_cards,
    round_bids,
    trick_count,
    trick_records,
    trump_card,
    trump_suit,
    trump_to_be_set,
    playable_cards,
    valid_bids,
    current_player,
    current_trick,
    max_round_number,
    current_trick_number,
    current_leading_player,
  };
}

export function playCardOverWebsocket(
  webSocket: WebSocket | null,
  card: number,
): void {
  if (!webSocket) {
    return;
  }
  webSocket.send(
    JSON.stringify({
      request_type: "game",
      function_name: "play_card",
      parameters: {
        card: card,
      },
    }),
  );
}

export function makeBidOverWebsocket(
  webSocket: WebSocket | null,
  bid: number,
  setSuit: number | null = null,
): void {
  if (!webSocket) {
    return;
  }
  const parameters =
    setSuit === null ? { bid: bid } : { bid: bid, suit: setSuit };

  webSocket.send(
    JSON.stringify({
      request_type: "game",
      function_name: "make_bid",
      parameters: parameters,
    }),
  );
}

const WizardBoardContext = createContext<WizardBoardContextType | null>(null);
const WizardPlayerContext = createContext<WizardPlayerContextType | null>(null);
const WizardGameContext = createContext<WizardGameContextType | null>(null);
const WizardCardSelectionContext =
  createContext<WizardCardSelectionContextType | null>(null);
const WizardBidSelectionContext =
  createContext<WizardBidSelectionContextType | null>(null);
const WizardScoreSheetContext =
  createContext<WizardScoreSheetContextType | null>(null);

export const useWizardBoardContext = () => {
  const context = useContext(WizardBoardContext);
  if (!context) {
    throw new Error(
      "useWizardBoardContext must be used within a WizardProvider",
    );
  }
  return context;
};

export const useWizardPlayerContext = () => {
  const context = useContext(WizardPlayerContext);
  if (!context) {
    throw new Error(
      "useWizardPlayerContext must be used within a WizardProvider",
    );
  }
  return context;
};

export const useWizardGameContext = () => {
  const context = useContext(WizardGameContext);
  if (!context) {
    throw new Error(
      "useWizardGameContext must be used within a WizardProvider",
    );
  }
  return context;
};

export const useWizardBidSelectionContext = () => {
  const context = useContext(WizardBidSelectionContext);
  if (!context) {
    throw new Error(
      "useWizardBidSelectionContext must be used within a WizardProvider",
    );
  }
  return context;
};

export const useWizardCardSelectionContext = () => {
  const context = useContext(WizardCardSelectionContext);
  if (!context) {
    throw new Error(
      "useWizardCardSelectionContext must be used within a WizardProvider",
    );
  }
  return context;
};

export const useWizardScoreSheetContext = () => {
  const context = useContext(WizardScoreSheetContext);
  if (!context) {
    throw new Error(
      "useWizardScoreSheetContext must be used within a WizardProvider",
    );
  }
  return context;
};

export function WizardProvider({
  gameID,
  children,
}: {
  gameID: string;
  children: ReactNode;
}) {
  // Backend state
  const [currentGameState, setCurrentGameState] =
    useState<WizardGameState | null>(null);
  const [players, setPlayers] = useState<Record<number, string | null>>({});
  const [aiModels, setAIModels] = useState<Record<string, string>>({});
  const [aiPlayers, setAIPlayers] = useState<Record<number, string>>({});
  const [currentUserPosition, setCurrentUserPosition] = useState<number | null>(
    null,
  );
  const [maxPlayers, setMaxPlayers] = useState(3);
  const [currentViewedTrick, setCurrentViewedTrick] = useState(1);
  const [currentMinTrick, setCurrentMinTrick] = useState(1);
  const [statusText, setStatusText] = useState<string>("Loading ...");
  const [viewedTrickCards, setViewedTrickCards] = useState<
    Record<number, number | null>
  >({});
  const [viewedTrickLeader, setViewedTrickLeader] = useState<number | null>(
    null,
  );
  const [viewedTrickWinner, setViewedTrickWinner] = useState<number | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  // Websocket
  const gameWebSocket = useRef<WebSocket | null>(null);

  const username = getUserName();

  useEffect(() => {
    let isMounted = true;

    const connectWebSocket = async () => {
      try {
        const webSocket = await getGameWebsocket(gameID);
        if (username) {
          setPlayerNameWebsocket(username, webSocket);
        }
        setIsLoading(false);

        if (!isMounted) return; // handle fast unmount

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
                  title: "Error",
                  description: parsedMessage.parameters.error_message,
                  color: "danger",
                });
                break;

              case "game_state": {
                const gameState = parseWizardGameState(
                  parsedMessage.parameters,
                );
                if (!gameState) {
                  console.error(
                    "Invalid game state: " + parsedMessage.parameters,
                  );
                  return;
                }
                setCurrentGameState(gameState);
                setCurrentViewedTrick(gameState.current_trick_number);
                const viewedTricks = Object.keys(gameState.trick_records).map(
                  Number,
                );
                if (viewedTricks.length > 0) {
                  setCurrentMinTrick(Math.min(...viewedTricks) + 1);
                } else {
                  setCurrentMinTrick(1);
                }
              }
              case "simple":
                console.log(parsedMessage.parameters.message);

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

  useEffect(() => {
    if (currentGameState === null) return;
    if (currentGameState.winners.length > 0) {
      const winnerNames = currentGameState.winners.map(
        (winner) => players[winner] || `Player ${winner}`,
      );
      setStatusText(`Winners: ${winnerNames.join(", ")}`);
      return;
    }
    if (currentGameState.round_state === RoundPhase.BIDDING) {
      setStatusText(`Bidding on round ${currentGameState.round_number}`);
      return;
    }
    if (currentGameState.round_state === RoundPhase.TRICK) {
      setStatusText(
        `Playing trick ${currentViewedTrick} on round ${currentGameState.round_number}`,
      );
      return;
    }
    setStatusText(`Round ${currentGameState.round_number}`);
  }, [currentGameState, players]);

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const metadata = (await getGameMetadata(gameID)) as WizardGameMetadata;
        setMaxPlayers(metadata.max_players);
      } catch (error) {
        console.error("Failed to fetch AI models:", error);
      }
    };
    fetchMetadata();
  }, [gameID]);

  // Get AI models
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

  // Set game details in context.
  const {
    gameCode,
    setGameCode,
    gameLink,
    setGameLink,
    gameState,
    setGameState,
    clearGame,
  } = useGameContext();
  const pathname = usePathname();

  useEffect(() => {
    setGameCode(gameID);
    setGameLink(pathname);
    setGameState("Pending game start");
    return () => {
      clearGame();
    };
  }, [gameID]);

  useEffect(() => {
    if (currentGameState === null || currentViewedTrick < currentMinTrick) {
      setViewedTrickCards({});
      setViewedTrickLeader(null);
      setViewedTrickWinner(null);
      return;
    }

    if (
      currentGameState.current_trick_number === currentViewedTrick ||
      currentViewedTrick < currentMinTrick
    ) {
      let trickCards: Record<number, number | null> = {};
      if (currentGameState.round_number === 1) {
        for (let i = 0; i < maxPlayers; i++) {
          if (i === currentUserPosition) {
            trickCards[i] = null;
          } else {
            trickCards[i] = currentGameState.visible_cards[i]?.[0] ?? null;
          }
        }
      } else {
        trickCards = currentGameState.current_trick;
      }
      setViewedTrickCards(trickCards);
      setViewedTrickLeader(currentGameState.current_leading_player);
      setViewedTrickWinner(null);
      return;
    }

    const trickRecords = currentGameState.trick_records[currentViewedTrick - 1];
    setViewedTrickCards(trickRecords.cards_played);
    setViewedTrickLeader(trickRecords.leading_player);
    setViewedTrickWinner(trickRecords.winner);
  }, [currentGameState, currentViewedTrick, currentMinTrick]);

  // Define meta parameters

  useEffect(() => {
    if (currentGameState === null) {
      setGameState("Loading ...");
    } else if (currentGameState.winners.length > 0) {
      setGameState("Game over");
    } else {
      setGameState("In game");
    }
  }, [currentGameState]);

  // Define utility functions

  const updateCurrentUserPosition = async (newPosition: number | null) => {
    if (newPosition === null) {
      leavePlayerPosition(gameWebSocket.current);
      setCurrentUserPosition(null);
    } else {
      setPlayerPosition(newPosition, gameWebSocket.current);
    }
  };

  const playCard = async (card: number) => {
    if (currentGameState === null) return;
    if (currentGameState.winners.length > 0) return;
    if (currentUserPosition !== currentGameState.current_player) return;
    if (currentViewedTrick !== currentGameState.current_trick_number) return;
    if (!username) return;
    playCardOverWebsocket(gameWebSocket.current, card);
  };

  const makeBid = async (bid: number, setSuit: number | null) => {
    if (currentGameState === null) return;
    if (currentGameState.winners.length > 0) return;
    if (currentUserPosition !== currentGameState.current_player) return;
    if (currentViewedTrick !== currentGameState.current_trick_number) return;
    if (!username) return;
    makeBidOverWebsocket(gameWebSocket.current, bid, setSuit);
  };

  const removeAIPlayer = async (position: number) => {
    removeAIPlayerOverWebsocket(gameWebSocket.current, position);
  };

  const addAIPlayer = async (position: number, model: string) => {
    addAIPlayerOverWebsocket(gameWebSocket.current, position, model);
  };

  if (isLoading || currentGameState === null)
    return <div>Loading game... </div>;

  let allCards: number[] = [];

  if (
    currentUserPosition !== null &&
    currentUserPosition in currentGameState.visible_cards
  ) {
    allCards = currentGameState.visible_cards[currentUserPosition];
  }

  return (
    <WizardBoardContext.Provider
      value={{
        numberOfPlayers: maxPlayers,
        playerNames: players,
        playerBids: currentGameState.round_bids,
        playerTricks: currentGameState.trick_count,
        playerScores: currentGameState.scores,
        activePlayer: currentGameState.current_player,
        viewingPlayer: currentUserPosition ?? 0,
        trickCards: viewedTrickCards,
        trickWinner: viewedTrickWinner,
        trickLeader: viewedTrickLeader,
        trumpCard: currentGameState.trump_card,
        trumpSuit: currentGameState.trump_suit,
      }}
    >
      <WizardPlayerContext.Provider
        value={{
          players,
          maxPlayers,
          aiPlayers,
          currentUserPosition,
          aiModels,
          updateCurrentUserPosition,
          addAIPlayer,
          removeAIPlayer,
        }}
      >
        <WizardGameContext.Provider
          value={{
            status: statusText,
            currentMinTrick,
            currentTrickNumber: currentGameState.current_trick_number,
            currentViewedTrick,
            setCurrentViewedTrick,
          }}
        >
          <WizardCardSelectionContext.Provider
            value={{
              allCards,
              playableCards: currentGameState.playable_cards,
              trumpSuit: currentGameState.trump_suit,
              playCard,
            }}
          >
            <WizardBidSelectionContext.Provider
              value={{
                validBids: currentGameState.valid_bids,
                roundNumber: currentGameState.round_number,
                selectSuit: currentGameState.trump_to_be_set,
                makeBid,
              }}
            >
              <WizardScoreSheetContext.Provider
                value={{
                  scoreSheet: currentGameState.score_sheet,
                  roundNumber: currentGameState.round_number,
                  maxRounds: currentGameState.max_round_number,
                  roundBids: currentGameState.round_bids,
                  players,
                  maxPlayers,
                  totalScore: currentGameState.scores,
                }}
              >
                {children}
              </WizardScoreSheetContext.Provider>
            </WizardBidSelectionContext.Provider>
          </WizardCardSelectionContext.Provider>
        </WizardGameContext.Provider>
      </WizardPlayerContext.Provider>
    </WizardBoardContext.Provider>
  );
}

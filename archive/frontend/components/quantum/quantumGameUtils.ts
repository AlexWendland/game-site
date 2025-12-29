import {
  QuantumHandState,
  QuantumLogEntry,
  QuantumActionOutcome,
} from "./QuantumContext";

const UNKNOWN_SUIT = "-1";

export function safeHandCopy(
  hands: Record<number, QuantumHandState>,
): Record<number, QuantumHandState> {
  const newHands: Record<number, QuantumHandState> = {};
  for (const player in hands) {
    const hand = hands[player];
    const playerHand = {
      suits: {},
      does_not_have_suit: hand.does_not_have_suit.slice(),
      total_cards: hand.total_cards,
    } as QuantumHandState;
    for (const suit in hand.suits) {
      if (suit !== UNKNOWN_SUIT) {
        playerHand.suits[suit] = hand.suits[suit];
      }
    }
    newHands[player] = playerHand;
  }
  return newHands;
}

export function getTargetLog(
  logs: QuantumLogEntry[],
  currentLogIndex: number,
): QuantumLogEntry | null {
  for (let i = currentLogIndex; i >= 0; i--) {
    const log = logs[i];
    if (log.function_call === "target_player") {
      return log;
    }
  }
  return null;
}

export function applyLogToGuess(
  guess: Record<number, QuantumHandState>,
  logs: QuantumLogEntry[],
  logIndex: number,
) {
  const log = logs[logIndex];
  if (!log) return guess;
  if (log.outcome !== QuantumActionOutcome.SUCCESS) {
    return guess;
  }
  if (log.function_call === "target_player") {
    const { targeted_player, suit } = log.parameters;
    if (guess[targeted_player].suits[suit] === 0) {
      guess[targeted_player].suits[suit] = 1;
    }
  }
  if (log.function_call === "respond_to_target") {
    const { response } = log.parameters;
    const targetLog = getTargetLog(logs, logIndex);
    if (!targetLog) throw new Error("Target log not found");
    const playerWhoTargeted = targetLog.player;
    const { targeted_player, suit } = targetLog.parameters;
    if (response) {
      // If the response was positive, we know the targeted player has this suit.
      if (guess[targeted_player].suits[suit] > 0) {
        guess[targeted_player].suits[suit] -= 1;
      }
      guess[playerWhoTargeted].suits[suit] += 1;
      guess[playerWhoTargeted].suits[suit] = Math.min(
        4,
        guess[playerWhoTargeted].suits[suit],
      );
    } else {
      if (!guess[targeted_player].does_not_have_suit.includes(suit)) {
        guess[targeted_player].does_not_have_suit.push(suit);
        guess[targeted_player].suits[suit] = 0;
      }
    }
  }
}

export function canIncreasePlayerGuess(
  playerGuess: Record<number, QuantumHandState>,
  currentHands: Record<number, QuantumHandState>,
  player: number,
  suit: number,
): boolean {
  if (playerGuess[player].does_not_have_suit.includes(suit)) {
    return false;
  }
  if (currentHands[player].does_not_have_suit.includes(suit)) {
    return false;
  }

  // If the player current guess has more cards than the total cards they can't increase it.
  const playerGuessTotalCards = playerGuess[player]?.total_cards || 0;
  let suitCount = 0;
  for (const suitKey in playerGuess[player].suits) {
    if (suitKey === UNKNOWN_SUIT) continue;
    suitCount += playerGuess[player].suits[suitKey] || 0;
  }
  return (
    suitCount < playerGuessTotalCards &&
    (playerGuess[player].suits[suit] || 0) < 4
  );
}

export function increasePlayerGuess(
  playerGuess: Record<number, QuantumHandState>,
  currentHands: Record<number, QuantumHandState>,
  player: number,
  suit: number,
): Record<number, QuantumHandState> {
  if (!canIncreasePlayerGuess(playerGuess, currentHands, player, suit)) {
    return playerGuess;
  }

  const newGuess = JSON.parse(JSON.stringify(playerGuess));
  newGuess[player].suits[suit] = (newGuess[player].suits[suit] || 0) + 1;
  return newGuess;
}

export function canDecreasePlayerGuess(
  playerGuess: Record<number, QuantumHandState>,
  currentHands: Record<number, QuantumHandState>,
  player: number,
  suit: number,
): boolean {
  if (playerGuess[player].does_not_have_suit.includes(suit)) {
    return false;
  }
  if (currentHands[player].does_not_have_suit.includes(suit)) {
    return false;
  }

  // If the player current guess is at or below the current known value - they can't decrease it.
  return (
    (playerGuess[player]?.suits[suit] || 0) > currentHands[player].suits[suit]
  );
}

export function decreasePlayerGuess(
  playerGuess: Record<number, QuantumHandState>,
  currentHands: Record<number, QuantumHandState>,
  player: number,
  suit: number,
): Record<number, QuantumHandState> {
  if (!canDecreasePlayerGuess(playerGuess, currentHands, player, suit)) {
    return playerGuess;
  }

  const newGuess = JSON.parse(JSON.stringify(playerGuess));
  newGuess[player].suits[suit] = Math.max(
    0,
    (newGuess[player].suits[suit] || 0) - 1,
  );
  return newGuess;
}

export function canTogglePlayerDoesNotHaveSuit(
  playerGuess: Record<number, QuantumHandState>,
  currentHands: Record<number, QuantumHandState>,
  player: number,
  suit: number,
): boolean {
  if (currentHands[player].does_not_have_suit.includes(suit)) return false;
  if (currentHands[player].suits[suit] > 0) return false;
  if (playerGuess[player].suits[suit] > 0) return false;
  return true;
}

export function togglePlayerDoesNotHaveSuit(
  playerGuess: Record<number, QuantumHandState>,
  currentHands: Record<number, QuantumHandState>,
  player: number,
  suit: number,
): Record<number, QuantumHandState> {
  if (
    !canTogglePlayerDoesNotHaveSuit(playerGuess, currentHands, player, suit)
  ) {
    return playerGuess;
  }

  const newGuess = JSON.parse(JSON.stringify(playerGuess));
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
}

export function resetPlayerGuess(
  currentHands: Record<number, QuantumHandState>,
  player: number,
): Record<number, QuantumHandState> {
  const newGuess = safeHandCopy(currentHands);
  return { [player]: newGuess[player] };
}

export function isGuessValid(
  playerGuess: Record<number, QuantumHandState>,
  currentHands: Record<number, QuantumHandState>,
): boolean {
  if (!playerGuess) return false;

  // Check if each suit has exactly 4 cards total across all players
  const numberOfPlayers = Object.keys(playerGuess).length;

  for (let suit = 0; suit < numberOfPlayers; suit++) {
    let totalCardsForSuit = 0;
    for (const player in playerGuess) {
      totalCardsForSuit += playerGuess[player].suits[suit] || 0;
    }
    if (totalCardsForSuit !== 4) {
      return false;
    }
  }

  // Check if each player has the correct total cards
  for (const player in playerGuess) {
    const playerNum = parseInt(player);
    const expectedTotal = currentHands[playerNum]?.total_cards || 0;
    let actualTotal = 0;

    for (const suitStr in playerGuess[player].suits) {
      const suit = parseInt(suitStr);
      if (suit >= 0) {
        // Exclude UNKNOWN_SUIT
        actualTotal += playerGuess[player].suits[suit] || 0;
      }
    }

    if (actualTotal !== expectedTotal) {
      return false;
    }
  }

  return true;
}

export function convertGuessToSuitAllocation(
  playerGuess: Record<number, QuantumHandState>,
): Record<number, Record<number, number>> {
  const suitAllocation: Record<number, Record<number, number>> = {};

  for (const playerStr in playerGuess) {
    const player = parseInt(playerStr);
    suitAllocation[player] = {};

    for (const suitStr in playerGuess[player].suits) {
      const suit = parseInt(suitStr);
      if (suit >= 0) {
        // Exclude UNKNOWN_SUIT
        suitAllocation[player][suit] = playerGuess[player].suits[suit] || 0;
      }
    }
  }

  return suitAllocation;
}

export function updatePlayerGuessFromGameState(
  currentPlayerGuess: Record<number, QuantumHandState>,
  gameState: {
    current_hands: Record<number, QuantumHandState>;
    game_log: QuantumLogEntry[];
    hint_levels: Record<number, number>;
  },
  currentUserPosition: number,
  lastLogIndex: number,
): { updatedGuess: Record<number, QuantumHandState>; newLogIndex: number } {
  const playerHintLevel = gameState.hint_levels[currentUserPosition];

  // Players with full hints can see everything already.
  if (playerHintLevel === 2) {
    // QuantumHintLevel.FULL
    return {
      updatedGuess: safeHandCopy(gameState.current_hands),
      newLogIndex: gameState.game_log.length,
    };
  }

  const newPlayerGuess = JSON.parse(
    JSON.stringify(currentPlayerGuess),
  ) as Record<number, QuantumHandState>;

  // Update total cards for all players
  for (const player in gameState.current_hands) {
    if (newPlayerGuess[player]) {
      newPlayerGuess[player].total_cards =
        gameState.current_hands[player].total_cards || 0;
    }
  }

  // Players with no hints only get the total cards in each hand.
  if (playerHintLevel === 0) {
    // QuantumHintLevel.NONE
    return {
      updatedGuess: newPlayerGuess,
      newLogIndex: gameState.game_log.length,
    };
  }

  // Apply log entries for partial hints
  for (
    let logIndex = lastLogIndex;
    logIndex < gameState.game_log.length;
    logIndex++
  ) {
    // This is super broke ... It needs to be fixed.
    try {
      applyLogToGuess(newPlayerGuess, gameState.game_log, logIndex);
    } catch (error) {
      console.error("Error applying log entry to player guess:", error);
      return {
        updatedGuess: safeHandCopy(gameState.current_hands),
        newLogIndex: gameState.game_log.length,
      };
    }
  }

  return {
    updatedGuess: newPlayerGuess,
    newLogIndex: gameState.game_log.length,
  };
}

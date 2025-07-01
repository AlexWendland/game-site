import {
  safeHandCopy,
  getTargetLog,
  applyLogToGuess,
  canIncreasePlayerGuess,
  increasePlayerGuess,
  canDecreasePlayerGuess,
  decreasePlayerGuess,
  canTogglePlayerDoesNotHaveSuit,
  togglePlayerDoesNotHaveSuit,
  isGuessValid,
  convertGuessToSuitAllocation,
  updatePlayerGuessFromGameState,
} from "./quantumGameUtils";
import { QuantumLogEntry, QuantumActionOutcome } from "./QuantumContext";

describe("safeHandCopy", () => {
  test("creates deep copy without UNKNOWN_SUIT", () => {
    const hands = {
      0: {
        suits: { 0: 2, 1: 1, "-1": 1 }, // -1 is UNKNOWN_SUIT
        does_not_have_suit: [2],
        total_cards: 4,
      },
      1: {
        suits: { 0: 1, 1: 2, "-1": 1 },
        does_not_have_suit: [],
        total_cards: 4,
      },
    };

    const result = safeHandCopy(hands);

    expect(result[0].suits).toEqual({ 0: 2, 1: 1 });
    expect(result[0].suits["-1"]).toBeUndefined();
    expect(result[0].does_not_have_suit).toEqual([2]);
    expect(result[0].total_cards).toBe(4);
    expect(result[1].suits).toEqual({ 0: 1, 1: 2 });
    expect(result[1].suits["-1"]).toBeUndefined();
  });

  test("creates independent copy (not reference)", () => {
    const hands = {
      0: {
        suits: { 0: 2 },
        does_not_have_suit: [1],
        total_cards: 2,
      },
    };

    const result = safeHandCopy(hands);
    result[0].suits[0] = 5;
    result[0].does_not_have_suit.push(2);

    expect(hands[0].suits[0]).toBe(2);
    expect(hands[0].does_not_have_suit).toEqual([1]);
  });
});

describe("getTargetLog", () => {
  const logs: QuantumLogEntry[] = [
    {
      player: 0,
      function_call: "set_hint_level",
      parameters: { hint_level: 1 },
      outcome: QuantumActionOutcome.SUCCESS,
      move_number: 1,
    },
    {
      player: 1,
      function_call: "target_player",
      parameters: { targeted_player: 2, suit: 0 },
      outcome: QuantumActionOutcome.SUCCESS,
      move_number: 2,
    },
    {
      player: 2,
      function_call: "respond_to_target",
      parameters: { response: true },
      outcome: QuantumActionOutcome.SUCCESS,
      move_number: 3,
    },
  ];

  test("finds most recent target_player log", () => {
    const result = getTargetLog(logs, 2);
    expect(result).toEqual(logs[1]);
  });

  test("returns null when no target_player log found", () => {
    const result = getTargetLog(logs, 0);
    expect(result).toBeNull();
  });

  test("searches backwards from given index", () => {
    const logsWithMultipleTargets = [
      ...logs,
      {
        player: 0,
        function_call: "target_player",
        parameters: { targeted_player: 1, suit: 1 },
        outcome: QuantumActionOutcome.SUCCESS,
        move_number: 4,
      },
    ];

    const result = getTargetLog(logsWithMultipleTargets, 3);
    expect(result?.parameters.targeted_player).toBe(1);
    expect(result?.parameters.suit).toBe(1);
  });
});

describe("applyLogToGuess", () => {
  const initialGuess = {
    0: { suits: { 0: 1, 1: 1 }, does_not_have_suit: [], total_cards: 2 },
    1: { suits: { 0: 1, 1: 1 }, does_not_have_suit: [], total_cards: 2 },
    2: { suits: { 0: 1, 1: 1 }, does_not_have_suit: [], total_cards: 2 },
  };

  test("applies target_player log correctly", () => {
    const logs: QuantumLogEntry[] = [
      {
        player: 0,
        function_call: "target_player",
        parameters: { targeted_player: 1, suit: 0 },
        outcome: QuantumActionOutcome.SUCCESS,
        move_number: 1,
      },
    ];

    applyLogToGuess(initialGuess, logs, 0);
    expect(initialGuess[1].suits[0]).toBe(1); // No change since already > 0
  });

  test("applies positive respond_to_target log correctly", () => {
    const logs: QuantumLogEntry[] = [
      {
        player: 0,
        function_call: "target_player",
        parameters: { targeted_player: 1, suit: 0 },
        outcome: QuantumActionOutcome.SUCCESS,
        move_number: 1,
      },
      {
        player: 1,
        function_call: "respond_to_target",
        parameters: { response: true },
        outcome: QuantumActionOutcome.SUCCESS,
        move_number: 2,
      },
    ];

    applyLogToGuess(initialGuess, logs, 1);
    expect(initialGuess[1].suits[0]).toBe(0); // Targeted player loses card
    expect(initialGuess[0].suits[0]).toBe(2); // Targeting player gains card
  });

  test("applies negative respond_to_target log correctly", () => {
    const logs: QuantumLogEntry[] = [
      {
        player: 0,
        function_call: "target_player",
        parameters: { targeted_player: 1, suit: 0 },
        outcome: QuantumActionOutcome.SUCCESS,
        move_number: 1,
      },
      {
        player: 1,
        function_call: "respond_to_target",
        parameters: { response: false },
        outcome: QuantumActionOutcome.SUCCESS,
        move_number: 2,
      },
    ];

    applyLogToGuess(initialGuess, logs, 1);
    expect(initialGuess[1].does_not_have_suit).toContain(0);
    expect(initialGuess[1].suits[0]).toBe(0);
  });

  test("throws error when respond_to_target has no corresponding target log", () => {
    const logs: QuantumLogEntry[] = [
      {
        player: 1,
        function_call: "respond_to_target",
        parameters: { response: true },
        outcome: QuantumActionOutcome.SUCCESS,
        move_number: 1,
      },
    ];

    expect(() => applyLogToGuess(initialGuess, logs, 0)).toThrow(
      "Target log not found",
    );
  });
});

describe("canIncreasePlayerGuess", () => {
  const playerGuess = {
    0: { suits: { 0: 1, 1: 1 }, does_not_have_suit: [2], total_cards: 2 },
    1: { suits: { 0: 1, 1: 1 }, does_not_have_suit: [], total_cards: 2 },
  };

  const currentHands = {
    0: { suits: { 0: 1, 1: 1 }, does_not_have_suit: [2], total_cards: 2 },
    1: { suits: { 0: 1, 1: 1 }, does_not_have_suit: [3], total_cards: 2 },
  };

  test("returns false when player doesn't have suit in guess", () => {
    const result = canIncreasePlayerGuess(playerGuess, currentHands, 0, 2);
    expect(result).toBe(false);
  });

  test("returns false when player doesn't have suit in current hands", () => {
    const result = canIncreasePlayerGuess(playerGuess, currentHands, 1, 3);
    expect(result).toBe(false);
  });

  test("returns false when player already has max cards", () => {
    const fullPlayerGuess = {
      0: { suits: { 0: 2, 1: 0 }, does_not_have_suit: [], total_cards: 2 },
    };
    const result = canIncreasePlayerGuess(fullPlayerGuess, currentHands, 0, 0);
    expect(result).toBe(false);
  });

  test("returns false when suit already has 4 cards", () => {
    const maxSuitGuess = {
      0: { suits: { 0: 4, 1: 0 }, does_not_have_suit: [], total_cards: 4 },
    };
    const maxCurrentHands = {
      0: { suits: { 0: 4, 1: 0 }, does_not_have_suit: [], total_cards: 4 },
    };
    const result = canIncreasePlayerGuess(maxSuitGuess, maxCurrentHands, 0, 0);
    expect(result).toBe(false);
  });

  test("returns true when increase is valid", () => {
    const validPlayerGuess = {
      0: { suits: { 0: 1, 1: 1 }, does_not_have_suit: [], total_cards: 4 },
      1: { suits: { 0: 1, 1: 1 }, does_not_have_suit: [], total_cards: 4 },
    };
    const validCurrentHands = {
      0: { suits: { 0: 1, 1: 1 }, does_not_have_suit: [], total_cards: 4 },
      1: { suits: { 0: 1, 1: 1 }, does_not_have_suit: [], total_cards: 4 },
    };
    const result = canIncreasePlayerGuess(
      validPlayerGuess,
      validCurrentHands,
      0,
      0,
    );
    expect(result).toBe(true);
  });
});

describe("increasePlayerGuess", () => {
  test("increases suit count when valid", () => {
    const playerGuess = {
      0: { suits: { 0: 1, 1: 1 }, does_not_have_suit: [], total_cards: 4 },
    };
    const currentHands = {
      0: { suits: { 0: 1, 1: 1 }, does_not_have_suit: [], total_cards: 4 },
    };

    const result = increasePlayerGuess(playerGuess, currentHands, 0, 0);
    expect(result[0].suits[0]).toBe(2);
  });

  test("returns unchanged guess when increase is invalid", () => {
    const playerGuess = {
      0: { suits: { 0: 1, 1: 1 }, does_not_have_suit: [2], total_cards: 2 },
    };
    const currentHands = {
      0: { suits: { 0: 1, 1: 1 }, does_not_have_suit: [2], total_cards: 2 },
    };

    const result = increasePlayerGuess(playerGuess, currentHands, 0, 2);
    expect(result).toEqual(playerGuess);
  });
});

describe("canDecreasePlayerGuess", () => {
  test("returns false when player has no cards of suit", () => {
    const playerGuess = {
      0: { suits: { 0: 0, 1: 1 }, does_not_have_suit: [], total_cards: 1 },
    };
    const currentHands = {
      0: { suits: { 0: 0, 1: 1 }, does_not_have_suit: [], total_cards: 1 },
    };

    const result = canDecreasePlayerGuess(playerGuess, currentHands, 0, 0);
    expect(result).toBe(false);
  });

  test("returns true when decrease is valid", () => {
    const playerGuess = {
      0: { suits: { 0: 3, 1: 1 }, does_not_have_suit: [], total_cards: 4 }, // Guess is higher
    };
    const currentHands = {
      0: { suits: { 0: 2, 1: 1 }, does_not_have_suit: [], total_cards: 3 }, // Known value is lower
    };

    const result = canDecreasePlayerGuess(playerGuess, currentHands, 0, 0);
    expect(result).toBe(true);
  });
});

describe("decreasePlayerGuess", () => {
  test("decreases suit count when valid", () => {
    const playerGuess = {
      0: { suits: { 0: 3, 1: 1 }, does_not_have_suit: [], total_cards: 4 }, // Guess is higher
    };
    const currentHands = {
      0: { suits: { 0: 2, 1: 1 }, does_not_have_suit: [], total_cards: 3 }, // Known value is lower
    };

    const result = decreasePlayerGuess(playerGuess, currentHands, 0, 0);
    expect(result[0].suits[0]).toBe(2); // Should decrease from 3 to 2
  });

  test("doesn't go below known value", () => {
    const playerGuess = {
      0: { suits: { 0: 2, 1: 1 }, does_not_have_suit: [], total_cards: 3 }, // Guess equals known
    };
    const currentHands = {
      0: { suits: { 0: 2, 1: 1 }, does_not_have_suit: [], total_cards: 3 }, // Known value
    };

    const result = decreasePlayerGuess(playerGuess, currentHands, 0, 0);
    expect(result[0].suits[0]).toBe(2); // Should remain unchanged since guess equals known
  });
});

describe("canTogglePlayerDoesNotHaveSuit", () => {
  test("returns false when current hands show player doesn't have suit", () => {
    const playerGuess = {
      0: { suits: { 0: 1, 1: 1 }, does_not_have_suit: [], total_cards: 2 },
    };
    const currentHands = {
      0: { suits: { 0: 1, 1: 1 }, does_not_have_suit: [2], total_cards: 2 },
    };

    const result = canTogglePlayerDoesNotHaveSuit(
      playerGuess,
      currentHands,
      0,
      2,
    );
    expect(result).toBe(false);
  });

  test("returns false when current hands show player has cards of suit", () => {
    const playerGuess = {
      0: { suits: { 0: 1, 1: 1 }, does_not_have_suit: [], total_cards: 2 },
    };
    const currentHands = {
      0: { suits: { 0: 2, 1: 1 }, does_not_have_suit: [], total_cards: 3 },
    };

    const result = canTogglePlayerDoesNotHaveSuit(
      playerGuess,
      currentHands,
      0,
      0,
    );
    expect(result).toBe(false);
  });

  test("returns false when player guess has cards of suit", () => {
    const playerGuess = {
      0: { suits: { 0: 1, 1: 1 }, does_not_have_suit: [], total_cards: 2 },
    };
    const currentHands = {
      0: { suits: { 0: 0, 1: 1 }, does_not_have_suit: [], total_cards: 1 },
    };

    const result = canTogglePlayerDoesNotHaveSuit(
      playerGuess,
      currentHands,
      0,
      0,
    );
    expect(result).toBe(false);
  });

  test("returns true when toggle is valid", () => {
    const playerGuess = {
      0: { suits: { 0: 0, 1: 1 }, does_not_have_suit: [], total_cards: 1 },
    };
    const currentHands = {
      0: { suits: { 0: 0, 1: 1 }, does_not_have_suit: [], total_cards: 1 },
    };

    const result = canTogglePlayerDoesNotHaveSuit(
      playerGuess,
      currentHands,
      0,
      0,
    );
    expect(result).toBe(true);
  });
});

describe("togglePlayerDoesNotHaveSuit", () => {
  test("adds suit to does_not_have_suit when not present", () => {
    const playerGuess = {
      0: { suits: { 0: 0, 1: 1 }, does_not_have_suit: [], total_cards: 1 },
    };
    const currentHands = {
      0: { suits: { 0: 0, 1: 1 }, does_not_have_suit: [], total_cards: 1 },
    };

    const result = togglePlayerDoesNotHaveSuit(playerGuess, currentHands, 0, 0);
    expect(result[0].does_not_have_suit).toContain(0);
    expect(result[0].suits[0]).toBe(0);
  });

  test("removes suit from does_not_have_suit when present", () => {
    const playerGuess = {
      0: { suits: { 0: 0, 1: 1 }, does_not_have_suit: [0], total_cards: 1 },
    };
    const currentHands = {
      0: { suits: { 0: 0, 1: 1 }, does_not_have_suit: [], total_cards: 1 },
    };

    const result = togglePlayerDoesNotHaveSuit(playerGuess, currentHands, 0, 0);
    expect(result[0].does_not_have_suit).not.toContain(0);
  });
});

describe("isGuessValid", () => {
  test("returns true for valid guess", () => {
    const playerGuess = {
      0: { suits: { 0: 2, 1: 2 }, does_not_have_suit: [], total_cards: 4 },
      1: { suits: { 0: 2, 1: 2 }, does_not_have_suit: [], total_cards: 4 },
    };
    const currentHands = {
      0: { suits: { 0: 2, 1: 2 }, does_not_have_suit: [], total_cards: 4 },
      1: { suits: { 0: 2, 1: 2 }, does_not_have_suit: [], total_cards: 4 },
    };

    const result = isGuessValid(playerGuess, currentHands);
    expect(result).toBe(true);
  });

  test("returns false when suit totals don't equal 4", () => {
    const playerGuess = {
      0: { suits: { 0: 3, 1: 2 }, does_not_have_suit: [], total_cards: 5 },
      1: { suits: { 0: 2, 1: 2 }, does_not_have_suit: [], total_cards: 4 },
    };
    const currentHands = {
      0: { suits: { 0: 3, 1: 2 }, does_not_have_suit: [], total_cards: 5 },
      1: { suits: { 0: 2, 1: 2 }, does_not_have_suit: [], total_cards: 4 },
    };

    const result = isGuessValid(playerGuess, currentHands);
    expect(result).toBe(false);
  });

  test("returns false when player total cards don't match expected", () => {
    const playerGuess = {
      0: { suits: { 0: 2, 1: 2 }, does_not_have_suit: [], total_cards: 4 },
      1: { suits: { 0: 2, 1: 2 }, does_not_have_suit: [], total_cards: 4 },
    };
    const currentHands = {
      0: { suits: { 0: 2, 1: 2 }, does_not_have_suit: [], total_cards: 3 }, // Mismatch
      1: { suits: { 0: 2, 1: 2 }, does_not_have_suit: [], total_cards: 4 },
    };

    const result = isGuessValid(playerGuess, currentHands);
    expect(result).toBe(false);
  });

  test("ignores UNKNOWN_SUIT in validation", () => {
    const playerGuess = {
      0: {
        suits: { 0: 2, 1: 2, "-1": 5 },
        does_not_have_suit: [],
        total_cards: 4,
      },
      1: {
        suits: { 0: 2, 1: 2, "-1": 3 },
        does_not_have_suit: [],
        total_cards: 4,
      },
    };
    const currentHands = {
      0: {
        suits: { 0: 2, 1: 2, "-1": 5 },
        does_not_have_suit: [],
        total_cards: 4,
      },
      1: {
        suits: { 0: 2, 1: 2, "-1": 3 },
        does_not_have_suit: [],
        total_cards: 4,
      },
    };

    const result = isGuessValid(playerGuess, currentHands);
    expect(result).toBe(true);
  });
});

describe("convertGuessToSuitAllocation", () => {
  test("converts player guess to suit allocation format", () => {
    const playerGuess = {
      0: {
        suits: { 0: 2, 1: 2, "-1": 5 },
        does_not_have_suit: [],
        total_cards: 4,
      },
      1: {
        suits: { 0: 2, 1: 2, "-1": 3 },
        does_not_have_suit: [],
        total_cards: 4,
      },
    };

    const result = convertGuessToSuitAllocation(playerGuess);
    expect(result).toEqual({
      0: { 0: 2, 1: 2 },
      1: { 0: 2, 1: 2 },
    });
  });

  test("excludes UNKNOWN_SUIT from allocation", () => {
    const playerGuess = {
      0: { suits: { 0: 1, "-1": 10 }, does_not_have_suit: [], total_cards: 1 },
    };

    const result = convertGuessToSuitAllocation(playerGuess);
    expect(result).toEqual({
      0: { 0: 1 },
    });
    expect(result[0]["-1"]).toBeUndefined();
  });
});

describe("updatePlayerGuessFromGameState", () => {
  const baseGameState = {
    current_hands: {
      0: { suits: { 0: 2, 1: 2 }, does_not_have_suit: [], total_cards: 4 },
      1: { suits: { 0: 2, 1: 2 }, does_not_have_suit: [], total_cards: 4 },
    },
    game_log: [] as QuantumLogEntry[],
    hint_levels: { 0: 1, 1: 1 }, // Partial hints
  };

  test("returns full hands for players with full hints", () => {
    const gameStateWithFullHints = {
      ...baseGameState,
      hint_levels: { 0: 2, 1: 1 }, // Player 0 has full hints
    };

    const result = updatePlayerGuessFromGameState(
      {},
      gameStateWithFullHints,
      0,
      0,
    );

    expect(result.updatedGuess).toEqual(
      safeHandCopy(gameStateWithFullHints.current_hands),
    );
    expect(result.newLogIndex).toBe(0);
  });

  test("returns only total cards for players with no hints", () => {
    const gameStateWithNoHints = {
      ...baseGameState,
      hint_levels: { 0: 0, 1: 1 }, // Player 0 has no hints
    };

    const currentGuess = {
      0: { suits: { 0: 1, 1: 1 }, does_not_have_suit: [], total_cards: 2 },
    };

    const result = updatePlayerGuessFromGameState(
      currentGuess,
      gameStateWithNoHints,
      0,
      0,
    );

    expect(result.updatedGuess[0].total_cards).toBe(4);
    expect(result.updatedGuess[0].suits).toEqual({ 0: 1, 1: 1 });
  });

  test("applies new log entries for partial hints", () => {
    const gameStateWithLogs = {
      ...baseGameState,
      game_log: [
        {
          player: 0,
          function_call: "target_player",
          parameters: { targeted_player: 1, suit: 0 },
          outcome: QuantumActionOutcome.SUCCESS,
          move_number: 1,
        },
      ],
    };

    const currentGuess = {
      0: { suits: { 0: 1, 1: 1 }, does_not_have_suit: [], total_cards: 4 },
      1: { suits: { 0: 0, 1: 1 }, does_not_have_suit: [], total_cards: 4 },
    };

    const result = updatePlayerGuessFromGameState(
      currentGuess,
      gameStateWithLogs,
      0,
      0,
    );

    expect(result.updatedGuess[1].suits[0]).toBe(1); // Target player gets minimum 1 card
    expect(result.newLogIndex).toBe(1);
  });

  test("falls back to current hands when log application fails", () => {
    const gameStateWithBadLogs = {
      ...baseGameState,
      game_log: [
        {
          player: 1,
          function_call: "respond_to_target",
          parameters: { response: true },
          outcome: QuantumActionOutcome.SUCCESS,
          move_number: 1,
        },
      ],
    };

    const currentGuess = {
      0: { suits: { 0: 1, 1: 1 }, does_not_have_suit: [], total_cards: 2 },
    };

    const result = updatePlayerGuessFromGameState(
      currentGuess,
      gameStateWithBadLogs,
      0,
      0,
    );

    expect(result.updatedGuess).toEqual(
      safeHandCopy(gameStateWithBadLogs.current_hands),
    );
    expect(result.newLogIndex).toBe(1);
  });
});

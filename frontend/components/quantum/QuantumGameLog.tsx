import {
  useQuantumContext,
  QuantumLogEntry,
  QuantumActionOutcome,
} from "./QuantumContext";

function formatLogEntry(
  entry: QuantumLogEntry,
  players: Record<number, string | null>,
  suitNames: Record<number, string | null>,
): string {
  const playerName = players[entry.player] || `Player ${entry.player}`;

  switch (entry.function_call) {
    case "set_suit_name":
      return `${playerName} chose suit "${entry.parameters.suit_name}"`;

    case "set_hint_level":
      return `${playerName} set hint level to ${entry.parameters.hint_level}`;

    case "target_player": {
      const targetName =
        players[entry.parameters.targeted_player] ||
        `Player ${entry.parameters.targeted_player}`;
      const suitName =
        suitNames[entry.parameters.suit] || `Suit ${entry.parameters.suit}`;
      return `${playerName} asked ${targetName} for ${suitName}`;
    }

    case "respond_to_target":
      return entry.parameters.response
        ? `${playerName} gave a card`
        : `${playerName} says go fish`;

    case "claim_no_win":
      return `${playerName} did not claim a win`;

    case "claim_own_suit":
      const ownSuitName =
        suitNames[entry.parameters.suit] || `Suit ${entry.parameters.suit}`;
      return `${playerName} claimed to own all ${ownSuitName}`;

    case "claim_all_suits_determined":
      return `${playerName} claimed all suits are determined`;

    default:
      return `${playerName} performed ${entry.function_call}`;
  }
}

function getOutcomeIcon(outcome: QuantumActionOutcome): string {
  switch (outcome) {
    case QuantumActionOutcome.SUCCESS:
      return "✓";
    case QuantumActionOutcome.WON:
      return "🏆";
    case QuantumActionOutcome.CONTRADICTION_CONTINUE:
      return "⚠️";
    case QuantumActionOutcome.CONTRADICTION_REVERTED:
      return "↩️";
    default:
      return "";
  }
}

function getOutcomeColor(outcome: QuantumActionOutcome): string {
  switch (outcome) {
    case QuantumActionOutcome.SUCCESS:
      return "text-green-600 dark:text-green-400";
    case QuantumActionOutcome.WON:
      return "text-yellow-600 dark:text-yellow-400";
    case QuantumActionOutcome.CONTRADICTION_CONTINUE:
      return "text-orange-600 dark:text-orange-400";
    case QuantumActionOutcome.CONTRADICTION_REVERTED:
      return "text-red-600 dark:text-red-400";
    default:
      return "text-gray-600 dark:text-gray-400";
  }
}

function QuantumGameLogPresenter({
  gameLog,
  suitNames,
  players,
}: {
  gameLog: QuantumLogEntry[] | null;
  suitNames: Record<number, string | null>;
  players: Record<number, string | null>;
}) {
  if (!gameLog || gameLog.length === 0) {
    return (
      <div className="w-full h-48 bg-gray-100 dark:bg-gray-800 rounded-lg p-4 flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400 text-center">
          {!gameLog ? "Loading..." : "Game hasn't started yet"}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full min-h-64 sm:min-h-80 bg-gray-100 dark:bg-gray-800 rounded-lg p-4 overflow-hidden">
      <h3 className="font-bold text-gray-700 dark:text-gray-300 mb-2 text-center text-sm sm:text-xl">
        Game Log
      </h3>

      <div className="space-y-1 overflow-y-auto h-52 sm:h-72">
        {gameLog.map((entry, index) => (
          <div
            key={`${entry.move_number}-${entry.player}-${index}`}
            className="flex items-start sm:space-x-2 text-sm sm:text-lg"
          >
            <span className={`min-w-4 ${getOutcomeColor(entry.outcome)}`}>
              {getOutcomeIcon(entry.outcome)}
            </span>

            <span className="text-gray-700 dark:text-gray-300 text-xs sm:text-sm lg:text-md flex-1 leading-relaxed">
              {formatLogEntry(entry, players, suitNames)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function QuantumGameLog() {
  const { gameState, players } = useQuantumContext();
  return (
    <QuantumGameLogPresenter
      gameLog={gameState?.game_log ?? null}
      suitNames={gameState?.suit_names ?? {}}
      players={players}
    />
  );
}

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
      const response = entry.parameters.response ? "Yes" : "No";
      return `${playerName} responded: ${response}`;

    case "claim_no_win":
      return `${playerName} claimed no one can win`;

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

export function QuantumGameLog() {
  const { gameState, players } = useQuantumContext();

  if (!gameState || !gameState.game_log || gameState.game_log.length === 0) {
    return (
      <div className="w-full h-48 bg-gray-100 dark:bg-gray-800 rounded-lg p-4 flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400 text-center">
          {!gameState ? "Loading..." : "Game hasn't started yet"}
        </p>
      </div>
    );
  }

  const maxLogEntries = 8; // Show last 8 entries to fit in the space
  const recentEntries = gameState.game_log.slice(-maxLogEntries);

  return (
    <div className="w-full h-48 bg-gray-100 dark:bg-gray-800 rounded-lg p-4 overflow-hidden">
      <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 text-center">
        Game Log
      </h3>

      <div className="space-y-1 overflow-y-auto h-36">
        {recentEntries.map((entry, index) => (
          <div
            key={`${entry.move_number}-${entry.player}-${index}`}
            className="flex items-start space-x-2 text-xs"
          >
            <span className={`min-w-[16px] ${getOutcomeColor(entry.outcome)}`}>
              {getOutcomeIcon(entry.outcome)}
            </span>

            <span className="text-gray-700 dark:text-gray-300 flex-1 leading-relaxed">
              {formatLogEntry(entry, players, gameState.suit_names)}
            </span>
          </div>
        ))}
      </div>

      {gameState.game_log.length > maxLogEntries && (
        <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-1">
          ... and {gameState.game_log.length - maxLogEntries} more entries
        </p>
      )}
    </div>
  );
}


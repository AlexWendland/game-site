import { UltimateSquare } from "@/components/ultimate/UltimateSquare";

export function TicTacToeBoard() {
  const {
    history,
    players,
    currentMove,
    currentPlayer,
    winner,
    winningLine,
    currentUserPosition,
    currentViewedMove,
    setCurrentViewedMove,
    updateCurrentUserPosition,
    makeMove,
  } = useTicTacToeContext();

  const status =
    winner !== null
      ? `Winner: ${players[winner]}`
      : currentMove == 9
        ? "Draw"
        : `Next player: ${currentPlayer}`;

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <div className="text-lg font-semibold">{status}</div>
      <div className="grid grid-cols-3 gap-2 w-full sm:max-w-[400px] md:max-w-[500px] aspect-square">
        {/* Values in the backend are just the player positions, convert this to X / 0 */}
        {history[currentMove].map((val, i) => (
          <TicTacToeSquare
            key={i}
            value={val !== null ? (val === 0 ? "X" : "O") : null}
            onSquareClick={() => makeMove(i)}
            isHighlighted={winningLine.includes(i)}
            isInCurrentView={val == history[currentViewedMove][i]}
          />
        ))}
      </div>
    </div>
  );
}

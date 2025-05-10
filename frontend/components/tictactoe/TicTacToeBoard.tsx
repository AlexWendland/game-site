import { TicTacToeSquare } from "@/components/tictactoe/TicTacToeSquare";
import { useTicTacToeContext } from "@/components/tictactoe/TicTacToeContext";

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

  return (
    <div className="grid grid-cols-3 gap-2 max-w-[600px] max-h-[600px] aspect-square">
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
  );
}

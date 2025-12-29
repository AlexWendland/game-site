import { TicTacToeSquare } from "@/components/tictactoe/TicTacToeSquare";
import { useTicTacToeBoardContext } from "@/components/tictactoe/TicTacToeContext";

export function TicTacToeBoard() {
  const {
    board,
    currentMove,
    winningLine,
    currentPlayerNumber,
    currentViewedMove,
    isCurrentUsersGo,
    makeMove,
  } = useTicTacToeBoardContext();

  return (
    <div className="grid grid-cols-3 gap-2 max-w-[600px] max-h-[600px] aspect-square">
      {board.map((moveNumber, i) => {
        // For history viewing, only show moves that have been made up to currentViewedMove
        const isVisibleInHistory = moveNumber !== -1 && moveNumber < currentViewedMove;
        const isInCurrentView = moveNumber !== -1 && moveNumber < currentViewedMove;

        // Convert move number to player symbol
        // Even move numbers (0, 2, 4, ...) = Player 0 (X)
        // Odd move numbers (1, 3, 5, ...) = Player 1 (O)
        let value: "X" | "O" | null = null;
        if (isVisibleInHistory) {
          value = moveNumber % 2 === 0 ? "X" : "O";
        }

        return (
          <TicTacToeSquare
            key={i}
            value={value}
            onSquareClick={() => makeMove(i)}
            isHighlighted={winningLine.includes(i)}
            isInCurrentView={isInCurrentView}
            isCurrentUsersGo={isCurrentUsersGo}
            currentPlayerNumber={currentPlayerNumber}
          />
        );
      })}
    </div>
  );
}

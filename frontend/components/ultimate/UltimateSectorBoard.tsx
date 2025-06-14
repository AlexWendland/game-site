import { UltimateSquare } from "@/components/ultimate/UltimateSquare";
import { useUltimateSectorBoardContext } from "./UltimateContext";

export function UltimateSectorBoard({ sectorIndex }: { sectorIndex: number }) {
  const {
    moves,
    sectorToPlayIn,
    currentMove,
    currentViewedMove,
    winner,
    makeMove,
    isCurrentUsersGo,
  } = useUltimateSectorBoardContext();

  const boardMoves = moves.slice(sectorIndex * 9, (sectorIndex + 1) * 9);
  const lookingAtLastMove =
    winner !== null && currentViewedMove === currentMove;
  const sectorIsPlayable =
    sectorToPlayIn[currentViewedMove] === null ||
    sectorToPlayIn[currentViewedMove] === sectorIndex;
  const valueInView = (val: number | null): boolean => {
    return val !== null && val < currentViewedMove;
  };

  return (
    <div className="grid grid-cols-3 gap-1 w-full h-full justify-items-center">
      {/* Values in the backend are just the player positions, convert this to X / 0 */}
      {boardMoves.map((val, i) => (
        <UltimateSquare
          key={i}
          value={val !== null ? (val % 2 === 0 ? "X" : "O") : null}
          onSquareClick={() => {
            makeMove(i + sectorIndex * 9);
          }}
          isHighlighted={
            !lookingAtLastMove && sectorIsPlayable && !valueInView(val)
          }
          isInCurrentView={valueInView(val)}
          isCurrentUserGo={
            isCurrentUsersGo && currentViewedMove === currentMove
          }
        />
      ))}
    </div>
  );
}

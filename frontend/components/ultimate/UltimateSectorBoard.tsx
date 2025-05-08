import { UltimateSquare } from "@/components/ultimate/UltimateSquare";

interface UltimateSectorBoardProps {
  keys: number[];
  moves: number[];
}

export function UltimateSectorBoard({ keys, moves }: UltimateSectorBoardProps) {
  return (
    <div className="grid grid-cols-3 gap-2 w-full">
      {/* Values in the backend are just the player positions, convert this to X / 0 */}
      {keys.map((val, i) => (
        <UltimateSquare
          key={val}
          value={moves[i] !== null ? (moves[i] % 2 === 0 ? "X" : "O") : null}
          onSquareClick={() => {}}
          isHighlighted={false}
          isInCurrentView={true}
        />
      ))}
    </div>
  );
}

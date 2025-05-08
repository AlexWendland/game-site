import { UltimateSquare } from "@/components/ultimate/UltimateSquare";

export function UltimateSectorBoard(keys: number[], values: number[]) {
  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <div className="grid grid-cols-3 gap-2 w-full sm:max-w-[400px] md:max-w-[500px] aspect-square">
        {/* Values in the backend are just the player positions, convert this to X / 0 */}
        {keys.map((val, i) => (
          <UltimateSquare
            key={val}
            value={values[i] !== null ? (values[i] === 0 ? "X" : "O") : null}
            onSquareClick={() => {}}
            isHighlighted={false}
            isInCurrentView={true}
          />
        ))}
      </div>
    </div>
  );
}

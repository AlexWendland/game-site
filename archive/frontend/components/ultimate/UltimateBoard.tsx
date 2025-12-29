import { UltimateSector } from "@/components/ultimate/UltimateSector";
import { useUltimateSectorContext } from "./UltimateContext";

export function UltimateBoard() {
  const { sectorsOwned, winningSectorLine, currentMove, currentViewedMove } =
    useUltimateSectorContext();
  return (
    <div className="grid grid-cols-3 gap-2 w-full max-w-96 sm:max-w-[600px] pt-10">
      {sectorsOwned.map((val, i) => (
        <UltimateSector
          key={i}
          sectorIndex={i}
          sectorWinningMove={
            val === null ? val : val < currentViewedMove ? val : null
          }
          isHighlighted={
            currentMove === currentViewedMove
              ? winningSectorLine.includes(i)
              : false
          }
        />
      ))}
    </div>
  );
}

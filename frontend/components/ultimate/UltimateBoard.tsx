import { UltimateSector } from "@/components/ultimate/UltimateSector";

export function UltimateBoard() {
  const indicies = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  return (
    <div className="grid grid-cols-3 gap-2 w-full sm:max-w-[500px] md:max-w-[600px]">
      {/* Values in the backend are just the player positions, convert this to X / 0 */}
      {indicies.map((val, i) => (
        <UltimateSector />
      ))}
    </div>
  );
}

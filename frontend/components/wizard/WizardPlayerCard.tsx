import clsx from "clsx";

type PlayerSlotProps = {
  playerName: string | null;
  isNextPlayer: boolean;
  bid: number | null;
  score: number;
  tricks: number;
};

export function WizardPlayerCard({
  playerName,
  isNextPlayer,
  bid,
  score,
  tricks,
}: PlayerSlotProps) {
  const tricksColor =
    bid === null
      ? "text-gray-200"
      : tricks < bid
        ? "text-blue-200"
        : tricks > bid
          ? "text-red-200"
          : "text-green-200";
  return (
    <div
      className={clsx(
        "bg-gray-800 text-white p-2 rounded-lg shadow-md",
        "w-full max-w-sm mx-auto",

        "transition-all duration-300 ease-in-out",
        {
          "ring-4 ring-offset-2 ring-offset-gray-900 ring-yellow-200":
            isNextPlayer,
          "bg-gray-700": isNextPlayer,
        },
      )}
    >
      <div>
        <h3 className="font-bold text-center text-lg truncate">
          {playerName || "Waiting for player..."}
        </h3>
      </div>

      <div className="flex justify-between items-center">
        {/* --- Left Section: Bid / Tricks --- */}
        <div className="text-center">
          <div className="flex space-x-2 mt-1 justify-center items-center">
            <p className="text-4xl font-bold text-gray-200">{bid ?? "-"}</p>
            <p className="text-xl font-light text-gray-500">/</p>
            <p className={`text-4xl font-bold ${tricksColor}`}>{tricks}</p>
          </div>
          <p className="text-xs uppercase font-semibold text-gray-400 tracking-wider">
            Bid / Tricks
          </p>
        </div>
        {/* --- Right Section: Score --- */}
        <div className="text-center">
          <p className="text-4xl font-bold mt-1">{score}</p>
          <p className="text-xs uppercase font-semibold text-gray-400 tracking-wider">
            Score
          </p>
        </div>
      </div>
    </div>
  );
}

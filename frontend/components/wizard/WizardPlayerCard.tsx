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
      ? ""
      : tricks < bid
        ? "text-blue-200 dark:text-blue-500"
        : tricks > bid
          ? "text-red-200 dark:text-red-500"
          : "text-green-500";
  return (
    <>
      <div
        className={clsx(
          "sm:hidden",
          "bg-gray-200 dark:bg-gray-700 p-2 rounded-lg shadow-md",
          "w-16 mx-auto",
          "grid grid-cols-1",
          "transition-all duration-300 ease-in-out",
          {
            "ring-2 ring-yellow-200": isNextPlayer,
          },
        )}
      >
        <div>
          <h3 className="font-bold text-center text-sm truncate">
            {playerName || "Waiting..."}
          </h3>
        </div>

        <div className="text-center">
          <div className="flex space-x-2 mt-1 justify-center items-center">
            <p className="text-md font-bold">{bid ?? "-"}</p>
            <p className="text-sm font-light text-gray-500">/</p>
            <p className={`text-md font-bold ${tricksColor}`}>{tricks}</p>
          </div>
        </div>
        {/* --- Right Section: Score --- */}
        <div className="text-center">
          <p className="text-md font-bold mt-1">{score}</p>
        </div>
      </div>
      <div
        className={clsx(
          "hidden sm:block",
          "bg-gray-200 dark:bg-gray-700 p-2 rounded-lg shadow-md",
          "w-full max-w-sm mx-auto",
          "transition-all duration-300 ease-in-out",
          {
            "ring-2 ring-yellow-200": isNextPlayer,
          },
        )}
      >
        <div>
          <h3 className="font-bold text-center text-lg truncate">
            {playerName || "Waiting for player..."}
          </h3>
        </div>

        <div className="flex justify-between items-center gap-2">
          {/* --- Left Section: Bid / Tricks --- */}
          <div className="text-center">
            <div className="flex space-x-2 mt-1 justify-center items-center">
              <p className="text-4xl font-bold">{bid ?? "-"}</p>
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
    </>
  );
}

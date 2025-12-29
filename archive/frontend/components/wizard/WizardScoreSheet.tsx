import { useState, useEffect } from "react";
import { useWizardScoreSheetContext } from "./WizardContext";
import { RoundResult } from "@/types/gameTypes";

export function WizardScoreSheet() {
  const {
    scoreSheet,
    roundNumber,
    maxRounds,
    roundBids,
    players,
    maxPlayers,
    totalScore,
  } = useWizardScoreSheetContext();
  const [isOpen, setIsOpen] = useState(false);

  // This turns off scrolling on background elements.
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add("overflow-hidden");
    } else {
      document.body.classList.remove("overflow-hidden");
    }

    // Clean up on unmount
    return () => {
      document.body.classList.remove("overflow-hidden");
    };
  }, [isOpen]);

  function renderRoundResult(roundResult: RoundResult) {
    const tricksColor =
      roundResult.bid === null
        ? "text-gray-300"
        : roundResult.tricks_won < roundResult.bid
          ? "text-blue-300"
          : roundResult.tricks_won > roundResult.bid
            ? "text-red-300"
            : "text-green-300";

    const scoreColor =
      roundResult.score < 0 ? "text-red-300" : "text-green-300";

    return (
      <div className="grid grid-cols-1 justify-items-center">
        <div>
          <span className="text-gray-500 dark:text-gray-300 text-md">
            {roundResult.bid}
          </span>{" "}
          <span className="text-gray-500 text-sm">/</span>{" "}
          <span className={`${tricksColor} text-md`}>
            {roundResult.tricks_won}
          </span>
        </div>
        <div className={`text-lg ${scoreColor}`}>{roundResult.score}</div>
      </div>
    );
  }

  function renderCurrentRoundResult(bid: number | null) {
    const displayBid = bid ?? "-";
    return (
      <div>
        <span className="text-gray-500 text-md">{displayBid}</span>{" "}
        <span className="text-gray-500 text-sm">/</span>{" "}
        <span className={`text-gray-500 text-md`}>-</span>
      </div>
    );
  }

  const columnHeaders = [
    {
      key: "round",
      value: "Round",
    },
  ];

  for (let player = 0; player < maxPlayers; player++) {
    columnHeaders.push({
      key: `player_${player}`,
      value: players[player] ?? `Player ${player + 1}`,
    });
  }

  function getPlayerColumnKey(position: number) {
    return `player_${position}`;
  }

  const rows: Record<string, any>[] = [];

  for (let roundIdx = 1; roundIdx < roundNumber; roundIdx++) {
    const rowData: Record<string, any> = {
      round: roundIdx, // Display round number starting from 1
    };
    for (let position = 0; position < maxPlayers; position++) {
      const playerColumnKey = getPlayerColumnKey(position);
      rowData[playerColumnKey] = renderRoundResult(
        scoreSheet[position][roundIdx],
      );
    }
    rows.push(rowData);
  }

  if (roundNumber <= maxRounds) {
    // Ensure current round is within game limits
    const currentRoundData: Record<string, any> = {
      round: roundNumber,
    };
    for (let position = 0; position < maxPlayers; position++) {
      const playerColumnKey = getPlayerColumnKey(position);
      currentRoundData[playerColumnKey] = renderCurrentRoundResult(
        roundBids[position],
      );
    }
    rows.push(currentRoundData);
  }

  // Future rounds (if any)
  for (
    let futureRoundNum = roundNumber + 1;
    futureRoundNum <= maxRounds;
    futureRoundNum++
  ) {
    const futureRoundData: Record<string, any> = {
      round: futureRoundNum,
    };
    for (let position = 0; position < maxPlayers; position++) {
      const playerColumnKey = getPlayerColumnKey(position);
      futureRoundData[playerColumnKey] = "-"; // Placeholder for future rounds
    }
    rows.push(futureRoundData);
  }

  // Total row
  const totalRowData: Record<string, any> = {
    round: "Total",
  };
  for (let position = 0; position < maxPlayers; position++) {
    const playerColumnKey = getPlayerColumnKey(position);
    totalRowData[playerColumnKey] = (
      <div className="text-lg font-bold">{totalScore[position] ?? "-"}</div>
    );
  }
  rows.push(totalRowData);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-blue-200 hover:bg-blue-300 dark:bg-blue-700 dark:hover:bg-blue-600 hover:scale-105 rounded-lg font-medium transition-all"
      >
        Scores
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-4 px-4">
          {/* Backdrop - gray out effect */}
          <div
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setIsOpen(false)}
          />

          {/* Modal */}
          <div
            role="dialog"
            aria-modal="true"
            className="relative top-14 bg-gray-200 dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-300 dark:border-gray-600">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Score Sheet
              </h2>
            </div>

            {/* Body */}
            <div className="px-6 py-4 overflow-y-auto max-h-[60vh]">
              <div className="overflow-x-auto">
                <table className="w-full bg-gray-200 dark:bg-gray-800 border-collapse">
                  <thead>
                    <tr className="bg-gray-300 dark:bg-gray-700">
                      {columnHeaders.map((column) => (
                        <th
                          key={column.key}
                          className="border border-gray-400 dark:border-gray-600 px-4 py-2 text-center font-semibold text-gray-900 dark:text-gray-100"
                        >
                          {column.value}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, index) => (
                      <tr
                        key={row.round}
                        className={
                          index % 2 === 0
                            ? "bg-gray-100 dark:bg-gray-800"
                            : "bg-gray-200 dark:bg-gray-700"
                        }
                      >
                        {columnHeaders.map((column) => (
                          <td
                            key={column.key}
                            className="border border-gray-400 dark:border-gray-600 px-4 py-2 text-center text-gray-900 dark:text-gray-100"
                          >
                            {row[column.key]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-300 dark:border-gray-600 flex justify-end">
              <button
                onClick={() => setIsOpen(false)}
                aria-label="Close modal"
                className="px-4 py-2 bg-blue-200 hover:bg-blue-300 dark:bg-blue-700 dark:hover:bg-blue-600 hover:scale-105 rounded-lg font-medium transition-all duration-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

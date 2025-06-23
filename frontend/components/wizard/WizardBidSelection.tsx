import { useState } from "react";
import clsx from "clsx";

import { useWizardBidSelectionContext } from "./WizardContext";

type BidSelectionPresenterProps = {
  validBids: number[];
  roundNumber: number;
  selectSuit: boolean;
  makeBid: (value: number, suit: number | null) => void;
};

export function BidSelectionPresenter({
  validBids,
  roundNumber,
  selectSuit,
  makeBid,
}: BidSelectionPresenterProps) {
  const [selectedSuit, setSelectedSuit] = useState<number | null>(null);
  const [selectedBid, setSelectedBid] = useState<number | null>(null);

  if (validBids.length === 0) {
    return <div />;
  }
  const suitOptions = [
    ["No trump", -1],
    ["Red", 0],
    ["Blue", 1],
    ["Green", 2],
    ["Yellow", 3],
  ];

  const canSubmit =
    selectedBid !== null && (!selectSuit || selectedSuit !== null);

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 justify-items-center gap-2 pb-2">
      <div className="col-start-1">
        {selectSuit && (
          <div className="grid grid-cols-1 justify-center">
            <div className="text-sm text-gray-500 text-center">
              {" "}
              Select trump suit{" "}
            </div>
            <div className="flex justify-center flex-wrap">
              {suitOptions.map(([suitName, suitValue]) => (
                <button
                  key={`suit-${suitValue}`}
                  onClick={() => setSelectedSuit(suitValue)}
                  className={clsx("px-3 py-1 m-1 rounded-lg transition-all", {
                    "bg-gray-200 hover:bg-gray-300 hover:scale-105 dark:bg-gray-700 dark:hover:bg-gray-600":
                      selectedSuit !== suitValue,
                    "bg-green-300 hover:bg-green-400 dark:bg-green-500 dark:hover:bg-green-400":
                      selectedSuit === suitValue,
                  })}
                >
                  {suitName}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="md:col-start-2 md:col-span-3 gird grid-cols-1 justify-items-center w-full">
        <div className="text-sm text-gray-500 text-center">
          Select your bid for round {roundNumber}
        </div>
        <div className="flex gap-2 justify-center flex-wrap">
          {Array.from({ length: roundNumber + 1 }).map((_, bidValue) => {
            const isSelectable = validBids.includes(bidValue);
            return (
              <button
                key={`bid-${bidValue}`}
                onClick={() => setSelectedBid(bidValue)}
                disabled={!isSelectable}
                className={clsx("px-2 rounded-full transition-all", {
                  "bg-gray-200 hover:bg-gray-300 hover:scale-110 dark:bg-gray-700 dark:hover:bg-gray-600":
                    selectedBid !== bidValue && isSelectable,
                  "bg-blue-300 hover:bg-blue-400 dark:bg-blue-500 dark:hover:bg-blue-400":
                    selectedBid === bidValue && isSelectable,
                  "opacity-30 bg-gray-100 dark:bg-gray-800": !isSelectable,
                })}
              >
                {bidValue}
              </button>
            );
          })}
        </div>
      </div>
      <div className="md:col-start-5 justify-right">
        <button
          onClick={() => {
            if (selectedBid !== null && validBids.includes(selectedBid)) {
              makeBid(selectedBid, selectedSuit);
              setSelectedSuit(null);
              setSelectedBid(null);
            }
          }}
          disabled={!canSubmit}
          className={clsx("p-2 rounded-2xl transition-all", {
            "bg-orange-300 hover:bg-orange-400 hover:scale-105 dark:bg-orange-700 dark:hover:bg-orange-600":
              canSubmit,
            "bg-gray-100 dark:bg-gray-800 opacity-30": !canSubmit,
          })}
        >
          Confirm bid
        </button>
      </div>
    </div>
  );
}

export function WizardBidSelection() {
  // Using the most bare version of the Container/Presenter pattern to make this testable.

  const { validBids, roundNumber, makeBid, selectSuit } =
    useWizardBidSelectionContext();

  return (
    <BidSelectionPresenter
      {...{ validBids, roundNumber, selectSuit, makeBid }}
    />
  );
}

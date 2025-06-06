import { useState } from "react";

import { Button } from "@heroui/react";
import { useWizardBidSelectionContext } from "./WizardContext";

export function WizardBidSelection() {
  const { validBids, roundNumber, makeBid, selectSuit } =
    useWizardBidSelectionContext();
  console.log(validBids);
  if (validBids.length === 0) {
    return <div />;
  }
  const [selectedSuit, setSelectedSuit] = useState<number | null>(null);
  const [selectedBid, setSelectedBid] = useState<number | null>(null);
  const suitOptions = [
    ("No trump", -1),
    ("Red", 0),
    ("Blue", 1),
    ("Green", 2),
    ("Yellow", 3),
  ];

  return (
    <div className="grid grid-cols-5 justify-items-center">
      <div className="col-start-1">
        {selectSuit && (
          <div className="grid grid-cols-1 justify-center">
            <div className="text-sm text-gray-500 text-center">
              {" "}
              Select trump suit{" "}
            </div>
            <div className="flex justify-center">
              {suitOptions.map((suitName, suitValue) => (
                <Button
                  key={`suit-${suitValue}`}
                  onPress={() => setSelectedSuit(suitValue)}
                  color={selectedSuit === suitValue ? "success" : "default"}
                >
                  {suitName}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="col-start-2 col-span-3 gird grid-cols-1 justify-items-center w-full">
        <div className="text-sm text-gray-500 text-center">
          Select your bid for round {roundNumber}
        </div>
        <div className="flex gap-2 justify-center">
          {Array.from({ length: roundNumber + 1 }).map((_, bidValue) => {
            const isSelectable = validBids.includes(bidValue);
            return (
              <Button
                key={`bid-${bidValue}`}
                onPress={() => setSelectedBid(bidValue)}
                color={selectedBid === bidValue ? "success" : "default"}
                isDisabled={!isSelectable}
              >
                {bidValue}
              </Button>
            );
          })}
        </div>
      </div>
      <div className="col-start-5 justify-right">
        <Button
          onPress={() => {
            if (selectedBid !== null) {
              makeBid(selectedBid, selectedSuit);
            }
          }}
          disabled={
            selectedBid === null && (!selectSuit || selectedSuit === null)
          }
        >
          Confirm bid
        </Button>
      </div>
    </div>
  );
}

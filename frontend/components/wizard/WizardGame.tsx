"use client";

import { WizardBoard } from "@/components/wizard/WizardBoard";
import { WizardPlayerBoard } from "@/components/wizard/WizardPlayerBoard";
import { useWizardGameContext } from "@/components/wizard/WizardContext";
import { WizardBidSelection } from "./WizardBidSelection";
import { WizardCardSelection } from "./WizardCardSelection";

export function WizardGame() {
  const { status } = useWizardGameContext();
  return (
    <div>
      <div className="grid grid-cols-1 justify-items-center gap-2 w-full h-full p-2">
        <div className="text-2xl font-bold">{status}</div>
        <WizardPlayerBoard />
        <div className="hidden md:block"></div>
        <WizardBoard />
        <WizardBidSelection />
        <WizardCardSelection />
      </div>
    </div>
  );
}

import { suitTextColors, suitSymbols } from "./WizardCommon";

type SuitProps = {
  suitNumber: number;
};

export function WizardSuit({ suitNumber }: SuitProps) {
  const suitText =
    suitNumber < 0 ? "X" : suitNumber > 4 ? "?" : suitSymbols.get(suitNumber);
  const suitColor = suitTextColors.get(suitNumber) || "text-gray-500";
  return (
    <div className={`text-5xl md:text-8xl font-bold ${suitColor}`}>
      {suitText}
    </div>
  );
}

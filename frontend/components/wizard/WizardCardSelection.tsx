import { WizardCard } from "@/components/wizard/WizardCard";
import { useWizardCardSelectionContext } from "./WizardContext";

export function WizardCardSelection() {
  const { allCards, playableCards, trumpSuit, playCard } =
    useWizardCardSelectionContext();
  if (allCards.length === 0) {
    return <div />;
  }
  return (
    <div className="flex justify-center flex-wrap gap-2">
      {allCards.map((cardValue) => {
        const isPlayable = playableCards.includes(cardValue);
        return (
          <div key={`card-${cardValue}`} className="flex-none">
            <WizardCard
              cardValue={cardValue}
              isHighlighted={isPlayable && playableCards.length > 1}
              disabled={!isPlayable}
              faded={!isPlayable && playableCards.length !== 0}
              trumpSuit={trumpSuit}
              onCardClick={() => playCard(cardValue)}
              assistantText={null}
            />
          </div>
        );
      })}
    </div>
  );
}

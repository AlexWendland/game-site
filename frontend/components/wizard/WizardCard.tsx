import clsx from "clsx";

type CardProps = {
  cardValue: number;
  isHighlighted: boolean;
  disabled: boolean;
  faded: boolean;
  trumpSuit: number;
  assistantText: string | null;
  onCardClick: () => void;
};

const suitTextColors = new Map<number, string>([
  [0, "text-red-500"],
  [1, "text-blue-500"],
  [2, "text-green-500"],
  [3, "text-yellow-500"],
]);

const suitSymbols = new Map<number, string>([
  [0, "R"],
  [1, "B"],
  [2, "G"],
  [3, "Y"],
]);

export function getCardSuit(card: number): number {
  if (card > 51) return -1;
  return Math.floor(card / 13);
}

export function getCardNumericalValue(card: number): number {
  if (card > 51) return -1;
  return card % 13;
}

export function isWizard(card: number): boolean {
  return card >= 56;
}

export function isNara(card: number): boolean {
  return card >= 52 && card <= 55;
}

export function WizardCard({
  cardValue,
  isHighlighted,
  disabled,
  faded,
  trumpSuit,
  assistantText,
  onCardClick,
}: CardProps) {
  let cardText: string = "";
  let cardAssistantText: string = assistantText || "No card";

  const cardSuit = getCardSuit(cardValue);
  const cardColor = suitTextColors.get(cardSuit) || "text-white";

  if (isWizard(cardValue)) {
    cardText = "W";
    cardAssistantText = assistantText || "Wins";
  } else if (isNara(cardValue)) {
    cardText = "N";
    cardAssistantText = assistantText || "Loses";
  } else if (cardValue >= 0) {
    const symbol = suitSymbols.get(cardSuit) || "?";
    const value = getCardNumericalValue(cardValue);
    cardText = `${symbol}${value}`;
    cardAssistantText = assistantText || cardSuit === trumpSuit ? "Trump" : "";
  }

  return (
    <button
      onClick={onCardClick}
      disabled={disabled}
      className={clsx(
        "relative", // This creates the positioning context for the child.
        "w-20",
        "bg-gray-800",
        "aspect-[2.5/3.5]",
        "rounded-lg",
        "shadow-lg",
        "flex items-center justify-center",
        "transition-all duration-200 ease-in-out",
        // --- State-based Styles ---
        {
          // Highlight effect: a bright ring around the card.
          "ring-4 ring-offset-2 ring-offset-gray-900 ring-yellow-200":
            !disabled && isHighlighted,
          "opacity-90": disabled && faded,
          "hover:scale-105 hover:shadow-xl": !disabled,
        },
      )}
    >
      {/* Assistant Text (Top Right) */}
      {cardAssistantText && (
        <span
          className={clsx(
            "absolute top-1.5 right-2", // Positions the element in the top-right corner.
            "text-xs font-bold",
            "text-gray-400",
          )}
        >
          {cardAssistantText}
        </span>
      )}

      {/* Main Card Value (Centered) */}
      <span className={clsx("text-4xl font-black", cardColor)}>{cardText}</span>
    </button>
  );
}

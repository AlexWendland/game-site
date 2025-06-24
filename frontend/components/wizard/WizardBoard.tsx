import { ReactNode } from "react";
import { WizardCard } from "@/components/wizard/WizardCard";
import { WizardPlayerCard } from "@/components/wizard/WizardPlayerCard";
import { useWizardBoardContext } from "./WizardContext";
import { WizardSuit } from "./WizardSuit";
import { WizardScoreSheet } from "./WizardScoreSheet";

const numberOfPlayersToCardPositions: Map<number, number[]> = new Map([
  [3, [0, 2, 4]],
  [4, [0, 1, 3, 5]],
  [5, [0, 1, 2, 4, 5]],
  [6, [0, 1, 2, 3, 4, 5]],
]);

function mapCardPositionToPlayer(
  cardPosition: number,
  numberOfPlayers: number,
  viewingPlayer: number,
): number | null {
  if (
    !numberOfPlayersToCardPositions.get(numberOfPlayers)?.includes(cardPosition)
  ) {
    return null;
  }
  if (cardPosition === 0) {
    return viewingPlayer;
  }
  if (numberOfPlayers === 3) {
    return (viewingPlayer + cardPosition / 2) % numberOfPlayers;
  }
  if (numberOfPlayers === 4) {
    if (cardPosition === 1) {
      return (viewingPlayer + 1) % numberOfPlayers;
    }
    return (viewingPlayer + (cardPosition - 1) / 2) % numberOfPlayers;
  }
  if (numberOfPlayers === 5) {
    if (cardPosition < 3) {
      return (viewingPlayer + cardPosition) % numberOfPlayers;
    }
    return (viewingPlayer + cardPosition - 1) % numberOfPlayers;
  }
  return (viewingPlayer + cardPosition) % numberOfPlayers;
}

const trumpSuitNames: Map<number, string> = new Map([
  [0, "Red"],
  [1, "Blue"],
  [2, "Green"],
  [3, "Yellow"],
  [-1, "No Trump"],
]);

export function WizardBoard() {
  // This is general shape of the board
  // ----------------------------------------------------
  // | Trump card | Trump Suit | Player 3 |        | Scores   |
  // | Player 2   |            | Card 3   |        | Player 4 |
  // |            | Card 2     | NOTICES  | Card 4 |          |
  // | Player 1   | Card 1     | NOTICES  | Card 5 | Player 5 |
  // | Player 0   |            |  Card 0  |        |          |
  // ----------------------------------------------------
  // Different player games use different slots
  // ( the current player is always 0)
  // 3 Player:           Player 2,           Player 4
  // 4 Player: Player 1,           Player 3,           Player 5
  // 5 Player: Player 1, Player 2,           Player 4, Player 5
  // 6 Player: Player 1, Player 2, Player 3, Player 4, Player 5

  const {
    numberOfPlayers,
    playerNames,
    playerBids,
    playerTricks,
    playerScores,
    activePlayer,
    viewingPlayer,
    trickCards,
    trickWinner,
    trickLeader,
    trumpCard,
    trumpSuit,
    isPlayerGo,
  } = useWizardBoardContext();

  function getCard(cardPosition: number): ReactNode {
    const player = mapCardPositionToPlayer(
      cardPosition,
      numberOfPlayers,
      viewingPlayer,
    );
    if (player === null) {
      return <div />;
    }
    const cardValue = trickCards[player] ?? -1;
    return (
      <WizardCard
        cardValue={cardValue}
        isHighlighted={trickWinner === player}
        disabled={true}
        faded={false}
        trumpSuit={trumpSuit ?? -1}
        assistantText={trickLeader === player ? "Leader" : null}
        onCardClick={() => {}}
      />
    );
  }

  function getPlayerCard(cardPosition: number): ReactNode {
    const player = mapCardPositionToPlayer(
      cardPosition,
      numberOfPlayers,
      viewingPlayer,
    );
    if (player === null) {
      return <div />;
    }
    return (
      <WizardPlayerCard
        playerName={playerNames[player] ?? null}
        isNextPlayer={activePlayer === player}
        bid={playerBids[player] ?? null}
        score={playerScores[player] ?? 0}
        tricks={playerTricks[player] ?? 0}
      />
    );
  }
  return (
    <div className="grid grid-cols-5 gap-2 w-full max-w-[800px] justify-items-center">
      <div className="col-start-1 row-start-1">
        <div className="col-start-1 grid grid-cols-1 items-center context-center">
          <div className="text-sm text-gray-500 text-center">Trump card</div>
          <WizardCard
            cardValue={trumpCard ?? -1}
            isHighlighted={false}
            disabled={true}
            faded={false}
            trumpSuit={trumpSuit ?? -1}
            assistantText={null}
            onCardClick={() => {}}
          />
        </div>
      </div>
      <div className="col-start-2 row-start-1">
        <div className="col-start-1 grid grid-cols-1 items-center content-center justify-items-center">
          <div className="text-sm text-gray-500 text-center">Trump suit</div>
          <WizardSuit suitNumber={trumpSuit ?? -1} />
        </div>
      </div>
      <div className="col-start-3 row-start-1">{getPlayerCard(3)}</div>
      <div className="col-start-5 row-start-1">
        <WizardScoreSheet />
      </div>
      <div className="col-start-1 row-start-2">{getPlayerCard(2)}</div>
      <div className="col-start-3 row-start-2">{getCard(3)}</div>
      <div className="col-start-5 row-start-2">{getPlayerCard(4)}</div>
      <div className="col-start-2 row-start-3">{getCard(2)}</div>
      <div className="col-start-3 row-start-3 row-span-2 flex items-center justify-center">
        {isPlayerGo && (
          <p className="animate-scaleBounce text-orange-500 font-extrabold text-xl sm:text-3xl md:text-4xl text-center">
            It's your go!
          </p>
        )}
      </div>
      <div className="col-start-4 row-start-3">{getCard(4)}</div>
      <div className="col-start-1 row-start-4">{getPlayerCard(1)}</div>
      <div className="col-start-2 row-start-4">{getCard(1)}</div>
      <div className="col-start-4 row-start-4">{getCard(5)}</div>
      <div className="col-start-5 row-start-4">{getPlayerCard(5)}</div>
      <div className="col-start-1 row-start-5">{getPlayerCard(0)}</div>
      <div className="col-start-3 row-start-5">{getCard(0)}</div>
    </div>
  );
}

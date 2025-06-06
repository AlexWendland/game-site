export type SquareValue = number | null;
export type BoardValue = SquareValue[];

export enum RoundPhase {
  BIDDING = "bidding",
  TRICK = "trick",
  ROUND_OVER = "round_over",
}

export type RoundResult = {
  bid: number;
  tricks_won: number;
  score: number;
};

export type TrickRecord = {
  cards_played: Record<number, number>;
  leading_player: number;
  leading_suit: number;
  winner: number;
};

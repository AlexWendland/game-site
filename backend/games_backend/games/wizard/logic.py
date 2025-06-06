import copy
import random

from games_backend.games.exceptions import GameException
from games_backend.games.wizard.models import (
    RoundPhase,
    RoundResult,
    TrickRecord,
    WizardGameStateParameters,
)


class WizardLogic:
    def __init__(self, number_of_players: int):
        if not (3 <= number_of_players <= 6):
            raise GameException("Number of players must be between 3 and 6 inclusive.")
        self._number_of_players: int = number_of_players
        self._current_round_number: int = 1
        self._score_sheet: ScoreSheet = ScoreSheet(self._number_of_players)
        self._starting_player: int = random.randint(0, self._number_of_players - 1)
        self._current_round: GameRound = GameRound(
            number_of_players=self._number_of_players,
            round_number=self._current_round_number,
            player_starting_tricks=self._starting_player,
            first_bidding_player=self._starting_player,
        )

    def set_player_bid(self, player_number: int, bid: int, set_suit: int = 5):
        self._validate_player_number(player_number)
        self._current_round.set_player_bid(player_number, bid, set_suit)
        if self._current_round.phase == RoundPhase.TRICK and self._current_round_number == 1:
            self._round_one_play()

    def play_card(self, player_number: int, card: int):
        self._validate_player_number(player_number)
        self._current_round.play_card(player_number, card)
        if self._current_round.phase == RoundPhase.ROUND_OVER:
            self._finalise_round()
            self._start_new_round()

    def _round_one_play(self):
        """
        In round 1 players can't see their cards, so we play them all.
        """
        for _ in range(self._number_of_players):
            player = self._current_round.current_player
            cards = self._current_round.get_player_cards(player)
            self.play_card(player, cards[0])

    def get_game_state(self, player_number: int | None, show_old_rounds: bool) -> WizardGameStateParameters:
        playable_cards: list[int] = []
        visible_cards: dict[int, list[int]] = {}
        valid_bids: list[int] = []
        if player_number is not None:
            valid_bids = self._current_round.get_valid_bids(player_number)
            if self._current_round_number == 1:
                # In round 1 you see everyone's cards except your own
                visible_cards = {
                    i: self._current_round.get_player_cards(i)
                    for i in range(self._number_of_players)
                    if i != player_number
                }
            else:
                visible_cards = {player_number: self._current_round.get_player_cards(player_number)}
                playable_cards = self._current_round.get_playable_cards(player_number)

        trick_records: dict[int, TrickRecord] = self._current_round.get_tricks()

        if not show_old_rounds and len(trick_records) > 0:
            # Let players see the last round.
            last_key = max(trick_records.keys())
            trick_records = {last_key: trick_records[last_key]}

        return WizardGameStateParameters(
            score_sheet=self._score_sheet.score_sheet,
            visible_cards=visible_cards,
            playable_cards=playable_cards,
            round_bids=self._current_round.get_bids(),
            trick_count=self._current_round.get_trick_count(),
            trick_records=trick_records,
            current_player=self._current_round.current_player,
            current_trick=self._current_round.get_current_trick(),
            round_state=self._current_round.phase,
            winners=self.winners,
            scores=self.current_scores,
            round_number=self._current_round_number,
            max_round_number=self.number_of_rounds,
            trump_card=self._current_round.get_trump_card(),
            trump_suit=self._current_round.get_trump_suit(),
            trump_to_be_set=self._current_round.trump_to_be_set,
            valid_bids=valid_bids,
        )

    def _finalise_round(self):
        bids = self._current_round.get_bids()
        tricks_won = self._current_round.get_trick_count()
        for player in range(self._number_of_players):
            self._score_sheet.add_round_result(player, self._current_round_number, bids[player], tricks_won[player])

    def _start_new_round(self):
        self._current_round_number += 1
        if self.game_over:
            return
        next_trick_starter = self._current_round.next_starting_player
        self._current_round = GameRound(
            number_of_players=self._number_of_players,
            round_number=self._current_round_number,
            player_starting_tricks=next_trick_starter,
            first_bidding_player=(self._starting_player + self._current_round_number - 1) % self._number_of_players,
        )

    @property
    def game_over(self) -> bool:
        return self._current_round_number > self.number_of_rounds

    @property
    def winners(self) -> list[int]:
        if not self.game_over:
            return []
        scores = self.current_scores
        max_score = max(scores.values())
        winners = [player for player, score in scores.items() if score == max_score]
        return winners

    @property
    def current_scores(self) -> dict[int, int]:
        return {player: self._score_sheet.get_player_score(player) for player in range(self._number_of_players)}

    @property
    def number_of_rounds(self) -> int:
        return int(60 / self._number_of_players)

    def _validate_player_number(self, player_number: int):
        if player_number < 0 or player_number >= self._number_of_players:
            raise GameException("Invalid player number.")


class ScoreSheet:
    def __init__(self, number_of_players: int):
        self._number_of_players = number_of_players
        self._score_sheet: dict[int, dict[int, RoundResult]] = {i: {} for i in range(self._number_of_players)}

    def add_round_result(self, player_number: int, round_number: int, bid: int, tricks_won: int):
        self._score_sheet[player_number][round_number] = RoundResult(
            bid=bid, tricks_won=tricks_won, score=self._calculate_score(bid, tricks_won)
        )

    @property
    def score_sheet(self) -> dict[int, dict[int, RoundResult]]:
        return self._score_sheet

    def get_player_round_result(self, player_number: int, round_number: int) -> RoundResult:
        return self._score_sheet[player_number][round_number]

    def _calculate_score(self, bid: int, tricks_won: int) -> int:
        if bid == tricks_won:
            return 20 + (10 * tricks_won)
        return -10 * abs(bid - tricks_won)

    def get_player_score(self, player_number: int) -> int:
        return sum(result.score for result in self._score_sheet[player_number].values())


class GameRound:
    def __init__(
        self, number_of_players: int, round_number: int, player_starting_tricks: int, first_bidding_player: int
    ):
        self._number_of_players: int = number_of_players
        self._round_number: int = round_number
        self._player_starting_tricks: int = player_starting_tricks

        self._phase: RoundPhase = RoundPhase.BIDDING
        self._player_cards: dict[int, list[int]] = {i: [] for i in range(self._number_of_players)}
        self._trump_card: int = -1
        self._trump_suit: int = -1
        self._deal_cards()

        self._bidding_round: BiddingRound = BiddingRound(
            number_of_players=number_of_players,
            round_number=round_number,
            starting_player=first_bidding_player,
            trump_suit=self._trump_suit,
            need_to_set_trump_suit=_is_wizard(self._trump_card),
        )

        self._trick_records: dict[int, TrickRecord] = {}
        self._current_trick: Trick | None = None

    @property
    def phase(self) -> RoundPhase:
        return self._phase

    @property
    def next_starting_player(self) -> int:
        last_round = len(self._trick_records) - 1
        return self._trick_records[last_round].winner

    def set_player_bid(self, player_number: int, bid: int, set_suit: int = 5):
        if self._phase != RoundPhase.BIDDING:
            raise GameException("Cannot bid at this time.")
        self._bidding_round.set_player_bid(player_number, bid, set_suit)
        if self._bidding_round.is_bidding_over:
            self._trump_suit = self._bidding_round.get_trump_suit()
            self._current_trick = Trick(
                player_number=self._number_of_players,
                leading_player=self._player_starting_tricks,
                trump_suit=self._trump_suit,
            )
            self._phase = RoundPhase.TRICK

    def play_card(self, player_number: int, card: int):
        if self._phase != RoundPhase.TRICK or self._current_trick is None:
            raise GameException("You can not play cards at this point.")
        self._current_trick.play_card(player_number, card, self._player_cards[player_number])
        self._player_cards[player_number].remove(card)
        if self._current_trick.winner is not None:
            self._trick_records[len(self._trick_records)] = self._current_trick.get_record()
            if len(self._trick_records) == self._round_number:
                self._phase = RoundPhase.ROUND_OVER
                return
            self._current_trick = Trick(
                player_number=self._number_of_players,
                leading_player=self.next_starting_player,
                trump_suit=self._trump_suit,
            )

    def get_player_cards(self, player_number: int) -> list[int]:
        return copy.copy(self._player_cards[player_number])

    def get_playable_cards(self, player_number: int) -> list[int]:
        if self._phase != RoundPhase.TRICK or self._current_trick is None:
            return []
        return self._current_trick.get_playable_cards(self._player_cards[player_number], player_number)

    def get_bids(self) -> dict[int, int]:
        return copy.copy(self._bidding_round.get_bids())

    def get_trump_suit(self) -> int:
        return self._bidding_round.get_trump_suit()

    def get_trump_card(self) -> int:
        return self._trump_card

    def get_trick_count(self) -> dict[int, int]:
        trick_count = {player: 0 for player in range(self._number_of_players)}
        for trick in self._trick_records.values():
            trick_count[trick.winner] += 1
        return trick_count

    def get_tricks(self) -> dict[int, TrickRecord]:
        return copy.copy(self._trick_records)

    def get_current_trick(self) -> dict[int, int | None]:
        if self._phase != RoundPhase.TRICK or self._current_trick is None:
            return {}
        return self._current_trick.cards_played

    def get_valid_bids(self, player_number: int) -> list[int]:
        if self._phase != RoundPhase.BIDDING:
            return []
        return self._bidding_round.get_valid_bids(player_number)

    @property
    def current_player(self) -> int:
        if self._phase == RoundPhase.BIDDING:
            return self._bidding_round.current_player
        if self._phase == RoundPhase.TRICK and self._current_trick is not None:
            return self._current_trick.current_player
        return -1

    @property
    def trump_to_be_set(self) -> bool:
        return self._bidding_round.trump_to_be_set

    def _deal_cards(self):
        all_cards = list(range(60))
        for i in range(self._number_of_players):
            self._player_cards[i] = random.sample(all_cards, self._round_number)
            all_cards = [card for card in all_cards if card not in self._player_cards[i]]
        if len(all_cards) > 0:
            self._trump_card = random.choice(all_cards)
            self._trump_suit = _get_card_suit(self._trump_card)


class BiddingRound:
    def __init__(
        self,
        number_of_players: int,
        round_number: int,
        starting_player: int,
        trump_suit: int,
        need_to_set_trump_suit: bool,
    ):
        self._number_of_players: int = number_of_players
        self._round_number: int = round_number
        self._current_player: int = starting_player
        self._starting_player: int = starting_player
        self._trump_suit: int = trump_suit
        self._player_can_set_suit: bool = need_to_set_trump_suit
        self._bids: dict[int, int] = {}

    @property
    def is_bidding_over(self) -> bool:
        return len(self._bids) == self._number_of_players

    @property
    def current_bidding_total(self) -> int:
        return sum(self._bids.values())

    def get_bids(self) -> dict[int, int]:
        return copy.copy(self._bids)

    def get_trump_suit(self) -> int:
        return self._trump_suit

    @property
    def trump_to_be_set(self) -> bool:
        return self._player_can_set_suit

    def get_valid_bids(self, player_number: int) -> list[int]:
        if self.is_bidding_over or player_number != self._current_player:
            return []
        valid_bids = list(range(0, self._round_number + 1))
        if self._round_number <= 3:
            return valid_bids

        if self.is_last_player_to_bid:
            excluded_bid = self._round_number - self.current_bidding_total
            if 0 <= excluded_bid <= self._round_number:
                valid_bids.remove(excluded_bid)

        return valid_bids

    @property
    def current_player(self) -> int:
        return self._current_player

    @property
    def is_last_player_to_bid(self) -> bool:
        return len(self._bids) == self._number_of_players - 1

    def set_player_bid(self, player_number: int, bid: int, set_suit: int = 5):
        if self.is_bidding_over:
            raise GameException("Bidding phase is already complete.")
        if player_number != self._current_player:
            raise GameException("It's not this player's turn to bid.")
        if bid < 0 or bid > self._round_number:
            raise GameException("Invalid bid. Must be between 0 and the round number.")

        # Suit setting logic
        if self._player_can_set_suit:
            if set_suit < -1 or set_suit > 3:
                raise GameException("Invalid suit. Must be between 0 and 3 or -1 for no suit.")
            self._trump_suit = set_suit
            self._player_can_set_suit = False
        elif set_suit != 5:
            raise GameException("Player cannot set suit at this time.")

        # Bids can't add up to the round number after round 3.

        if self.is_last_player_to_bid and self._round_number > 3:
            if self.current_bidding_total + bid == self._round_number:
                raise GameException("Total bids can not sum to the round number after round 3.")

        self._bids[player_number] = bid
        self._current_player = (self._current_player + 1) % self._number_of_players


class Trick:
    def __init__(self, player_number: int, leading_player: int, trump_suit: int):
        self._number_of_players: int = player_number
        self._cards_played: dict[int, int] = {}
        self._leading_player: int = leading_player
        self._current_player: int = leading_player
        self._trump_suit: int = trump_suit
        self._leading_suit_still_to_play: bool = True
        self._leading_suit: int = -1
        self._winner: int | None = None

    @property
    def winner(self) -> int | None:
        return self._winner

    @property
    def current_player(self) -> int:
        return self._current_player

    @property
    def cards_played(self) -> dict[int, int | None]:
        return {player: self._cards_played.get(player, None) for player in range(self._number_of_players)}

    def get_playable_cards(self, cards: list[int], player_number: int) -> list[int]:
        if self._has_player_played_card(player_number):
            return []

        has_leading_suit = (self._leading_suit != -1) and any(
            _get_card_suit(card) == self._leading_suit for card in cards
        )
        if not has_leading_suit:
            return copy.copy(cards)

        return [card for card in cards if (not _card_has_suit(card)) or _get_card_suit(card) == self._leading_suit]

    def play_card(self, player_number: int, card: int, cards: list[int]):
        if player_number != self._current_player:
            raise GameException("It's not this player's turn to play a card.")
        if self._winner is not None:
            raise GameException("Trick is already over. No more cards can be played.")
        if card not in cards:
            raise GameException(f"Player does not have card {card}.")
        if card not in self.get_playable_cards(cards, player_number):
            raise GameException(f"Player can not play {card} as it is not playable.")
        self._cards_played[player_number] = card
        self._current_player = (self._current_player + 1) % self._number_of_players
        self._set_leading_suit(card)
        if self._current_player == self._leading_player:
            self._winner = self._determine_winner()

    def get_record(self) -> TrickRecord:
        if self._winner is None:
            raise GameException("Trick is not yet complete. No winner has been determined.")
        return TrickRecord(
            cards_played=copy.copy(self._cards_played),
            leading_player=self._leading_player,
            leading_suit=self._leading_suit,
            winner=self._winner,
        )

    def _has_player_played_card(self, player_number: int) -> bool:
        return player_number in self._cards_played

    def _set_leading_suit(self, card: int):
        if not self._leading_suit_still_to_play:
            return
        self._leading_suit = _get_card_suit(card)
        if _card_has_suit(card):
            self._leading_suit_still_to_play = False
        elif _is_wizard(card):
            self._leading_suit_still_to_play = False
        elif _is_nara(card):
            self._leading_suit_still_to_play = True

    def _determine_winner(self):
        """
        To determine the winner we need to do the following checks.
        1. If a wizard has been played, the first person to play a wizard wins.
        2. If a trump has been played, the highest trump wins.
        3. If a leading suit has been set, the highest leading suit wins.
        4. If all cards are Nara, the leading player wins.
        """
        played_wizard: list[int] = []
        played_trump: list[int] = []
        played_leading_suit: list[int] = []
        for player, card in self._cards_played.items():
            if _is_wizard(card):
                played_wizard.append(player)
            elif _card_has_suit(card) and _get_card_suit(card) == self._trump_suit:
                played_trump.append(player)
            elif _card_has_suit(card) and _get_card_suit(card) == self._leading_suit:
                played_leading_suit.append(player)
        if len(played_wizard) > 0:
            return min(
                played_wizard,
                key=lambda player_number: (player_number - self._leading_player) % self._number_of_players,
            )
        if len(played_trump) > 0:
            return max(
                played_trump, key=lambda player_number: _get_card_numerical_value(self._cards_played[player_number])
            )
        if len(played_leading_suit) > 0:
            return max(
                played_leading_suit,
                key=lambda player_number: _get_card_numerical_value(self._cards_played[player_number]),
            )
        return self._leading_player


"""
Cards are represented by the number 0-59.

0-12: Red cards (suit 0)
13-25: Blue cards (suit 1) with value n % 13
26-38: Green cards (suit 2) with value n % 13
39-51: Yellow cards (suit 3) with value n % 13
52-55: Nara cards, lose to everything except itself.
56-59: Wizard cards, win against everything.
"""


def _card_has_suit(card: int) -> bool:
    return card < 52


def _get_card_suit(card: int) -> int:
    if card > 51:
        return -1
    return card // 13


def _get_card_numerical_value(card: int) -> int:
    if card >= 52:
        return -1
    return card % 13


def _is_wizard(card: int) -> bool:
    return card >= 56


def _is_nara(card: int) -> bool:
    return 52 <= card <= 55

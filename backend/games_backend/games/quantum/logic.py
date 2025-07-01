import copy
from typing import Any

from games_backend.games.quantum.constants import UNKNOWN_SUIT
from games_backend.games.quantum.exceptions import ContradictionError
from games_backend.games.quantum.hand import QuantumHand
from games_backend.games.quantum.models import QuantumGameState, QuantumHandState
from games_backend.games.quantum.solver import SolutionResult, get_hand_solution
from games_backend.models import QuantumHintLevel


class QuantumLogic:
    def __init__(self, number_of_players: int):
        self._current_hands: dict[int, QuantumHand] = {
            player: QuantumHand(number_of_players, player) for player in range(number_of_players)
        }
        self._winner: int | None = None
        self._current_target_player: int | None = None
        self._current_target_suit: int | None = None
        self._number_of_players: int = number_of_players
        self._game_state: QuantumGameState = QuantumGameState.TARGET_PLAYER
        self._game_history: dict[QuantumHintLevel, list[dict[int, QuantumHandState]]] = {
            level: [{i: self._current_hands[i].export_hand(level) for i in range(number_of_players)}]
            for level in QuantumHintLevel
        }
        self._move_number: int = 1
        # As players can be skipped, this needs to be stored separately from the move number.
        self._current_player: int = 0
        # Track players who are out of cards (have 0 cards)
        # These players cannot take turns or be targeted by other players
        self._players_are_out: set[int] = set()

    def _validate_player(self, player: int) -> None:
        """Validate that a player number is valid for this game."""
        if player < 0 or player >= self._number_of_players:
            raise ValueError(f"Invalid player {player}. Must be between 0 and {self._number_of_players - 1}.")

    def _validate_suit(self, suit: int) -> None:
        """Validate that a suit number is valid for this game."""
        if suit < 0 or suit >= self._number_of_players:
            raise ValueError(f"Invalid suit {suit}. Must be between 0 and {self._number_of_players - 1}.")

    def _check_changed_state(self, changes: dict[int, QuantumHand]) -> SolutionResult:
        """Check with these changes if the solution is still valid"""
        new_game_hands = copy.deepcopy(self._current_hands)
        for player, new_hand in changes.items():
            new_game_hands[player] = new_hand
        return get_hand_solution(new_game_hands)

    def _update_game_state_with_solution(self, new_solution: SolutionResult):
        """Update the game state based on a new solution."""
        if not new_solution.has_solution:
            raise ContradictionError("No valid solutions found for the current game state.")
        # Update minimum requirements for each player
        for player, requirements in new_solution.minimum_requirements.items():
            updated_requirements = requirements.copy()
            updated_requirements[UNKNOWN_SUIT] = self._current_hands[player].total_cards - sum(requirements.values())
            self._current_hands[player].update_inferred_cards(updated_requirements)

    def _update_players_out(self) -> None:
        """Update the set of players who are out of cards."""
        for player in range(self._number_of_players):
            if self._current_hands[player].total_cards == 0:
                self._players_are_out.add(player)
        # If only one player is left, they are the winner
        if len(self._players_are_out) >= self._number_of_players - 1:
            self._game_state = QuantumGameState.FINISHED
            self._winner = next((p for p in range(self._number_of_players) if p not in self._players_are_out), None)

    def _update_player_number(self) -> None:
        self._current_player = (self._current_player + 1) % self._number_of_players
        while self._current_player in self._players_are_out:
            self._current_player = (self._current_player + 1) % self._number_of_players

    def _progress_game(self) -> None:
        if self._game_state == QuantumGameState.TARGET_PLAYER:
            if self._current_target_player is None or self._current_target_suit is None:
                raise ValueError("Cannot progress game until the target player and suit is set.")
            self._game_state = QuantumGameState.RESPONSE
        elif self._game_state == QuantumGameState.RESPONSE:
            self._game_state = QuantumGameState.CLAIM_WIN
            self._current_target_player = None
            self._current_target_suit = None
        elif self._game_state == QuantumGameState.CLAIM_WIN:
            # Update game history
            for level, history in self._game_history.items():
                history.append({i: self._current_hands[i].export_hand(level) for i in range(self._number_of_players)})
            if self._winner is not None:
                self._game_state = QuantumGameState.FINISHED
            else:
                self._move_number += 1
                self._game_state = QuantumGameState.TARGET_PLAYER
                # Check if any players are out of cards and mark them as out
                self._update_players_out()
                self._update_player_number()
        elif self._game_state == QuantumGameState.FINISHED:
            raise ValueError("Game is already finished. Cannot progress further.")

    def target_player(self, acting_player: int, targeted_player: int, suit: int) -> None:
        self._validate_player(acting_player)
        self._validate_player(targeted_player)
        self._validate_suit(suit)
        if self._game_state != QuantumGameState.TARGET_PLAYER:
            raise ValueError("Cannot target player in current game state.")
        if self._current_player != acting_player:
            raise ValueError(f"Player {acting_player} cannot target player {targeted_player} as it is not their turn.")
        if targeted_player == acting_player:
            raise ValueError("Cannot target yourself.")
        if acting_player in self._players_are_out:
            raise ValueError(f"Player {acting_player} is out of cards and cannot take turns.")
        if targeted_player in self._players_are_out:
            raise ContradictionError(f"Player {targeted_player} is out of cards and cannot be targeted.")
        new_hand = self._current_hands[acting_player].copy()
        new_hand.request_suit(suit)
        new_solution = self._check_changed_state({acting_player: new_hand})
        if not new_solution.has_solution:
            raise ContradictionError(
                f"Requesting suit {suit} from {targeted_player} leads to a contradiction.",
                player=acting_player,
                suit=suit,
            )
        self._current_target_player = targeted_player
        self._current_target_suit = suit
        self._current_hands[acting_player] = new_hand
        self._update_game_state_with_solution(new_solution)
        self._progress_game()

    def respond_to_target(self, acting_player: int, response: bool) -> None:
        self._validate_player(acting_player)
        if self._game_state != QuantumGameState.RESPONSE:
            raise ValueError("Cannot respond to target in current game state.")
        if self._current_target_player != acting_player:
            raise ValueError(f"Player {acting_player} cannot respond as they have not been targeted.")
        if self._current_target_suit is None:
            raise ValueError("No suit has been targeted yet.")

        if response:
            new_target_hand = self._current_hands[acting_player].copy()
            new_target_hand.remove_card(self._current_target_suit)
            new_destination_hand = self._current_hands[self._current_player].copy()
            new_destination_hand.add_card(self._current_target_suit)
            new_solution = self._check_changed_state(
                {acting_player: new_target_hand, self._current_player: new_destination_hand}
            )
            if not new_solution.has_solution:
                raise ContradictionError(
                    f"Responding positively to suit {self._current_target_suit} leads to a contradiction.",
                    player=acting_player,
                    suit=self._current_target_suit,
                )
            self._current_hands[acting_player] = new_target_hand
            self._current_hands[self._current_player] = new_destination_hand
            self._update_game_state_with_solution(new_solution)
        else:
            # If responding negatively, mark the suit as unavailable
            new_hand = self._current_hands[acting_player].copy()
            new_hand.does_not_have_suit(self._current_target_suit)
            new_solution = self._check_changed_state({acting_player: new_hand})
            if not new_solution.has_solution:
                raise ContradictionError(
                    f"Responding negatively to suit {self._current_target_suit} leads to a contradiction.",
                    player=acting_player,
                    suit=self._current_target_suit,
                )
            self._current_hands[acting_player] = new_hand
            self._update_game_state_with_solution(new_solution)
        self._progress_game()

    def claim_no_win(self, acting_player: int) -> None:
        self._validate_player(acting_player)
        if self._game_state != QuantumGameState.CLAIM_WIN:
            raise ValueError("Cannot claim win in current game state.")
        if self._current_player != acting_player:
            raise ValueError(f"Player {acting_player} cannot claim win as it is not their turn.")
        if acting_player in self._players_are_out:
            raise ValueError(f"Player {acting_player} is out of cards and cannot take turns.")
        self._progress_game()

    def claim_own_a_suit(self, acting_player: int, suit: int) -> None:
        self._validate_player(acting_player)
        self._validate_suit(suit)
        if self._game_state != QuantumGameState.CLAIM_WIN:
            raise ValueError("Cannot claim own suit in current game state.")
        if self._current_player != acting_player:
            raise ValueError(f"Player {acting_player} cannot claim suit {suit} as it is not their turn.")
        if acting_player in self._players_are_out:
            raise ValueError(f"Player {acting_player} is out of cards and cannot take turns.")
        if suit not in self._current_hands[acting_player].winning_suits:
            # If a player incorrectly claims they have won with a suit they can not claim another win.
            self._progress_game()
            raise ContradictionError(
                f"Player {acting_player} does not have a winning hand for suit {suit}.", player=acting_player, suit=suit
            )
        # If we reach here, the player has claimed a winning hand
        self._winner = acting_player
        self._progress_game()

    def claim_all_suits_determined(self, acting_player: int, suit_allocation: dict[int, dict[int, int]]):
        """Claim that all suits are determined and provide the allocation."""
        self._validate_player(acting_player)
        if self._game_state != QuantumGameState.CLAIM_WIN:
            raise ValueError("Cannot claim all suits determined in current game state.")
        if self._current_player != acting_player:
            raise ValueError(f"Player {acting_player} cannot claim all suits as it is not their turn.")
        if acting_player in self._players_are_out:
            raise ValueError(f"Player {acting_player} is out of cards and cannot take turns.")

        all_claims_correct = all(
            self._current_hands[player].is_correct_claim(suit_allocation.get(player, {}))
            for player in range(self._number_of_players)
        )
        if not all_claims_correct:
            raise ContradictionError(
                "Claimed hand does not match the inferred state of the hands.", player=acting_player
            )

        self._winner = acting_player
        self._progress_game()

    def _get_available_moves(self, hint_level: QuantumHintLevel) -> list[bool | int]:
        if self._game_state == QuantumGameState.RESPONSE and self._current_target_player is not None:
            current_hand = self._current_hands[self._current_target_player].export_hand(hint_level)
        else:
            current_hand = self._current_hands[self._current_player].export_hand(hint_level)
        suits_current_player_could_have = [
            suit for suit in range(self._number_of_players) if suit not in current_hand.does_not_have_suit
        ]
        if self._game_state == QuantumGameState.TARGET_PLAYER:
            # Return suits that the current player could have, but only if there are valid targets
            return suits_current_player_could_have
        elif self._game_state == QuantumGameState.RESPONSE:
            # Legal responses for the targeted player
            if self._current_target_player is None or self._current_target_suit is None:
                raise ValueError("Cannot get available moves in response state without a target player and suit.")
            if current_hand.suits.get(self._current_target_suit, 0) > 0:
                return [True]
            can_have_suit = (
                self._current_target_suit in suits_current_player_could_have
                and current_hand.suits.get(UNKNOWN_SUIT, 0) > 0
            )
            if can_have_suit:
                return [True, False]
            else:
                return [False]
        elif self._game_state == QuantumGameState.CLAIM_WIN:
            if hint_level.value >= QuantumHintLevel.TRACK.value:
                # Assist front end in determining which suits
                return suits_current_player_could_have
            return [i for i in range(self._number_of_players)]

        return []

    def get_partial_state(self, hint_level: QuantumHintLevel) -> dict[str, Any]:
        return {
            "history": self._game_history[hint_level],
            "winner": self._winner,
            "game_state": self._game_state,
            "current_player": self._current_player,
            "move_number": self._move_number,
            "current_target_player": self._current_target_player,
            "current_target_suit": self._current_target_suit,
            "current_hands": {
                player: self._current_hands[player].export_hand(hint_level) for player in range(self._number_of_players)
            },
            "available_moves": self._get_available_moves(hint_level),
            "players_are_out": list(self._players_are_out),
        }

    @property
    def move_number(self) -> int:
        return self._move_number

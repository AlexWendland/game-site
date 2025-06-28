import copy
from typing import Any, Self, override

import pydantic
from constraint import Problem

from games_backend.games.quantum.models import QuantumGameState, QuantumHandState
from games_backend.models import QuantumHintLevel

# In Quantum Go Fish, the number of suits always equals the number of players
# Each suit is created by the first player to ask for it
UNKNOWN_SUIT = -1
CARDS_PER_SUIT = 4
DEFAULT_HAND_SIZE = 4


class ContradictionError(Exception):
    """Raised when a contradiction is found in the game state."""

    def __init__(self, message: str, player: int | None = None, suit: int | None = None, **kwargs):
        super().__init__(message)
        self.message = message
        self.player = player
        self.suit = suit
        # Store any additional metadata
        for key, value in kwargs.items():
            setattr(self, key, value)


class QuantumHand:
    """
    Represents a player's hand in Quantum Go Fish.

    Maintains two levels of information:
    - Forced cards: Cards determined by the player's direct actions (requesting, receiving)
    - Deduced cards: Cards determined by all players' actions and game logic

    Args:
        number_of_players: Number of players in the game (equals number of suits)
    """

    def __init__(self, number_of_players: int, player: int | None = None):
        if number_of_players < 1:
            raise ValueError("Number of players must be at least 1")

        self._number_of_players: int = number_of_players
        self._player: int | None = player
        # Forced cards are determined by the actions of the player.
        self._declared_cards: dict[int, int] = {suit: 0 for suit in range(number_of_players)}
        self._declared_cards[UNKNOWN_SUIT] = DEFAULT_HAND_SIZE
        # Deduced cards are determined by the actions of all players.
        # Therefore:
        # self._declared_cards[suit] <= self._inferred_cards[suit] for real suits.
        # self._declared_cards[UNKNOWN_SUIT] >= self._inferred_cards[UNKNOWN_SUIT]
        self._inferred_cards: dict[int, int] = copy.deepcopy(self._declared_cards)
        # When a player says they do not have a suit, we record this here.
        self._does_not_have_suit: set[int] = set()

    def _validate_suit(self, suit: int) -> None:
        """Validate that a suit number is valid for this game."""
        if suit < 0 or suit >= self._number_of_players:
            raise ValueError(f"Invalid suit {suit}. Must be between 0 and {self._number_of_players - 1}.")

    def copy(self) -> Self:
        """Create a deep copy of this hand."""
        return copy.deepcopy(self)

    def add_card(self, suit: int) -> None:
        """Add a card of the specified suit to this hand.

        This represents receiving a card from another player.
        Increases both forced and deduced card counts.

        Args:
            suit: The suit of the card to add
        """
        self._validate_suit(suit)
        self._declared_cards[suit] += 1
        self._inferred_cards[suit] += 1

    def remove_card(self, suit: int) -> None:
        """Remove a card of the specified suit from this hand.

        This represents giving a card to another player.
        Decreases both forced and deduced card counts.

        Args:
            suit: The suit of the card to remove

        Raises:
            ValueError: If the suit is unavailable or no cards can be removed
        """
        self._validate_suit(suit)
        if suit in self._does_not_have_suit:
            raise ContradictionError(
                f"Cannot remove card from suit {suit} as it is known to be unavailable.", suit=suit, player=self._player
            )

        # Remove from deduced cards first: being able to do this guarantees we can remove it from the forced cards.
        if self._inferred_cards[suit] > 0:
            self._inferred_cards[suit] -= 1
        elif self._inferred_cards[UNKNOWN_SUIT] > 0:
            self._inferred_cards[UNKNOWN_SUIT] -= 1
        else:
            raise ContradictionError(
                f"Cannot remove card from suit {suit} as it is not available.", suit=suit, player=self._player
            )

        # Remove from forced cards
        if self._declared_cards[suit] > 0:
            self._declared_cards[suit] -= 1
        else:
            self._declared_cards[UNKNOWN_SUIT] -= 1

        if self._declared_cards[UNKNOWN_SUIT] == 0:
            self._does_not_have_suit = {
                suit for suit, count in self._declared_cards.items() if count == 0 and suit != UNKNOWN_SUIT
            }

    def request_suit(self, suit: int) -> None:
        """Request cards of a specific suit.

        This represents the player asking another player for cards of this suit.
        In quantum go fish, requesting a suit means you must have at least one.

        Args:
            suit: The suit to request

        Raises:
            ContradictionError: If the suit is unavailable or cannot be requested
        """
        self._validate_suit(suit)
        if suit in self._does_not_have_suit:
            raise ContradictionError(
                f"Cannot request suit {suit} as it is known to be unavailable.", suit=suit, player=self._player
            )

        # Convert unknown cards to this suit if we don't have any yet
        if self._inferred_cards[suit] == 0:
            if self._inferred_cards[UNKNOWN_SUIT] == 0:
                raise ContradictionError(
                    f"Cannot request suit {suit} as it is not available.", suit=suit, player=self._player
                )
            self._inferred_cards[suit] = 1
            self._inferred_cards[UNKNOWN_SUIT] -= 1

        # Update forced cards if we don't have any forced cards of this suit
        if self._declared_cards[suit] == 0:
            self._declared_cards[suit] = 1
            self._declared_cards[UNKNOWN_SUIT] -= 1

        if self._declared_cards[UNKNOWN_SUIT] == 0:
            self._does_not_have_suit = {
                suit for suit, count in self._declared_cards.items() if count == 0 and suit != UNKNOWN_SUIT
            }

    def does_not_have_suit(self, suit: int) -> None:
        """Mark a suit as unavailable for this player.

        This represents the player declaring they don't have any cards of this suit.

        Args:
            suit: The suit to mark as unavailable

        Raises:
            ContradictionError: If the player already has deduced cards of this suit
        """
        self._validate_suit(suit)
        if suit in self._does_not_have_suit:
            return
        if self._inferred_cards[suit] > 0:
            raise ContradictionError(
                f"Cannot mark suit {suit} as unavailable as it has inferred cards.", suit=suit, player=self._player
            )
        self._does_not_have_suit.add(suit)

    def update_inferred_cards(self, inferred_cards: dict[int, int]) -> None:
        """Update the inferred card counts based on game logic.

        This is used when the game's constraint solver determines new information
        about the minimum cards this player must have.

        Args:
            inferred_cards: New inferred card counts

        Raises:
            ValueError: If the update violates quantum go fish constraints
        """
        future_copy = copy.deepcopy(inferred_cards)

        # Validate total cards remain the same
        if sum(future_copy.values()) != self.total_cards:
            raise ValueError("Total number of inferred cards does not match the total number of cards.")

        # Cannot increase unknown cards (information only becomes more certain)
        if future_copy[UNKNOWN_SUIT] > self._inferred_cards[UNKNOWN_SUIT]:
            raise ValueError("Cannot increase the number of unknown cards.")

        # Cannot decrease known cards (information only becomes more certain)
        for suit in range(self._number_of_players):
            if future_copy[suit] < self._inferred_cards[suit]:
                raise ValueError(f"Cannot decrease the number of cards for suit {suit}.")

        self._inferred_cards = future_copy

    def is_correct_claim(self, claimed_hand: dict[int, int]) -> bool:
        """Check if a claimed hand matches the inferred state of this hand.
        Args:
            claimed_hand: Dictionary mapping suit to card count
        Returns:
            True if the claim matches the inferred state, False otherwise
        """
        if not self.is_fully_determined:
            return False
        return all(claimed_hand.get(suit, 0) == count for suit, count in self._inferred_cards.items())

    def export_hand(self, hint_level: QuantumHintLevel) -> QuantumHandState:
        if hint_level == QuantumHintLevel.NONE:
            return QuantumHandState(
                suits={UNKNOWN_SUIT: self.total_cards},
                does_not_have_suit=set(),
            )
        if hint_level == QuantumHintLevel.TRACK:
            return QuantumHandState(
                suits=self.declared_cards,
                does_not_have_suit=self.suits_not_available,
            )
        if hint_level == QuantumHintLevel.FULL:
            return QuantumHandState(
                suits=self.inferred_cards,
                does_not_have_suit=self.suits_not_available,
            )

    @property
    def number_of_players(self) -> int:
        """Number of players in the game (equals number of suits)."""
        return self._number_of_players

    @property
    def inferred_cards(self) -> dict[int, int]:
        """Current inferred card counts for all suits including unknown."""
        return copy.deepcopy(self._inferred_cards)

    @property
    def declared_cards(self) -> dict[int, int]:
        """Current declared card counts for all suits including unknown."""
        return copy.deepcopy(self._declared_cards)

    @property
    def total_cards(self) -> int:
        """Total number of cards in this hand."""
        return sum(self._declared_cards.values())

    @property
    def suits_not_available(self) -> set[int]:
        """Set of suits this player has declared they don't have."""
        return self._does_not_have_suit.copy()

    @property
    def winning_suits(self) -> list[int]:
        """Check if this hand has a winning condition (4 cards of any suit)."""
        complete_suits: list[int] = []
        for suit in range(self._number_of_players):
            if self._inferred_cards.get(suit, 0) >= CARDS_PER_SUIT:
                complete_suits.append(suit)
        return complete_suits

    @property
    def is_fully_determined(self) -> bool:
        """Check if this hand is fully determined (no unknown cards)."""
        return self._inferred_cards[UNKNOWN_SUIT] == 0

    @override
    def __str__(self) -> str:
        return (
            f"QuantumHand(declared_cards={self._declared_cards}, "
            f"inferred_cards={self._inferred_cards}, "
            f"does_not_have_suit={self._does_not_have_suit})"
        )


class SolutionResult(pydantic.BaseModel):
    """
    Result of solving a quantum go fish game state.

    Args:
        number_of_solutions: How many valid card distributions exist
        minimum_requirements: For each player and suit, the minimum number of cards
                            they must have across all valid solutions
    """

    number_of_solutions: pydantic.NonNegativeInt
    minimum_requirements: dict[int, dict[int, int]]


def get_hand_solution(hands: dict[int, QuantumHand]) -> SolutionResult:
    """
    Determine if the current game state has valid solutions and calculate minimum requirements.

    Args:
        hands: Mapping from player number to their QuantumHand

    Returns:
        SolutionResult containing number of solutions and minimum card requirements
    """
    if not hands:
        return SolutionResult(number_of_solutions=0, minimum_requirements={})

    number_of_players = len(hands)

    solutions = _calculate_game_solutions(hands, number_of_players)
    minimum_reqs = _calculate_minimum_requirements(solutions, number_of_players)

    return SolutionResult(number_of_solutions=len(solutions), minimum_requirements=minimum_reqs)


def _calculate_game_solutions(
    hands: dict[int, QuantumHand], number_of_players: int
) -> list[dict[tuple[int, int], int]]:
    """
    Use constraint solver to find all valid card distributions.

    Creates variables for each (player, suit) combination and applies constraints:
    1. Each player has exactly their total_cards number of cards
    2. Each suit has exactly CARDS_PER_SUIT cards total across all players
    3. Each player has at least their minimum deduced cards for each suit
    4. Each player has at most their deduced + unknown cards for each suit

    Note: In Quantum Go Fish, number of suits equals number of players.

    Args:
        hands: Player hands with current deduced state
        number_of_players: Total players in game (also equals number of suits)

    Returns:
        List of solutions, each mapping (player, suit) -> card count
    """
    problem = Problem()

    # Track variables by suit to enforce suit totals
    variables_by_suit: dict[int, list[tuple[int, int]]] = {suit: [] for suit in range(number_of_players)}

    # Track variables by player to enforce player totals
    variables_by_player: dict[int, list[tuple[int, int]]] = {player: [] for player in range(number_of_players)}

    # Create variables for each (player, suit) combination
    for player, player_hand in hands.items():
        unknown_cards = player_hand.inferred_cards[UNKNOWN_SUIT]

        for suit in range(number_of_players):
            if suit not in player_hand.suits_not_available:
                variable = (player, suit)
                current_count = player_hand.inferred_cards.get(suit, 0)
                max_cards = min(CARDS_PER_SUIT, current_count + unknown_cards)

                # Variable domain: from current deduced count to maximum possible
                problem.addVariable(variable, list(range(current_count, max_cards + 1)))
                variables_by_suit[suit].append(variable)
                variables_by_player[player].append(variable)

    # Constraint: Each player has exactly their total cards
    for player, variables in variables_by_player.items():
        if variables:  # Only add constraint if player has variables
            target_total = hands[player].total_cards
            problem.addConstraint(lambda *args, total=target_total: sum(args) == total, variables)

    # Constraint: Each suit has exactly CARDS_PER_SUIT cards total
    for suit, variables in variables_by_suit.items():
        if not variables:
            raise ValueError(f"No players can have cards in suit {suit}.")
        problem.addConstraint(lambda *args: sum(args) == CARDS_PER_SUIT, variables)

    return problem.getSolutions()


def _calculate_minimum_requirements(
    solutions: list[dict[tuple[int, int], int]], number_of_players: int
) -> dict[int, dict[int, int]]:
    """
    Calculate minimum card requirements for each player/suit across all solutions.

    Args:
        solutions: All valid card distributions from constraint solver
        number_of_players: Total players in game (also equals number of suits)

    Returns:
        Nested dict: player -> suit -> minimum cards required
    """
    if not solutions:
        return {}

    # Initialize with maximum possible values, then find minimums
    min_requirements = {
        player: {suit: CARDS_PER_SUIT for suit in range(number_of_players)} for player in range(number_of_players)
    }

    # For each solution, update minimums
    for solution in solutions:
        for (player, suit), card_count in solution.items():
            min_requirements[player][suit] = min(min_requirements[player][suit], card_count)

    # Set to 0 for player/suit combinations that don't appear in any solution
    for player in range(number_of_players):
        for suit in range(number_of_players):
            if not any((player, suit) in solution for solution in solutions):
                min_requirements[player][suit] = 0

    return min_requirements


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
        if new_solution.number_of_solutions == 0:
            raise ContradictionError("No valid solutions found for the current game state.")
        # Update minimum requirements for each player
        for player, requirements in new_solution.minimum_requirements.items():
            updated_requirements = requirements.copy()
            updated_requirements[UNKNOWN_SUIT] = self._current_hands[player].total_cards - sum(requirements.values())
            self._current_hands[player].update_inferred_cards(updated_requirements)

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
        new_hand = self._current_hands[acting_player].copy()
        new_hand.request_suit(suit)
        new_solution = self._check_changed_state({acting_player: new_hand})
        if new_solution.number_of_solutions == 0:
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
            if new_solution.number_of_solutions == 0:
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
            if new_solution.number_of_solutions == 0:
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
        self._progress_game()

    def claim_own_a_suit(self, acting_player: int, suit: int) -> None:
        self._validate_player(acting_player)
        self._validate_suit(suit)
        if self._game_state != QuantumGameState.CLAIM_WIN:
            raise ValueError("Cannot claim own suit in current game state.")
        if self._current_player != acting_player:
            raise ValueError(f"Player {acting_player} cannot claim suit {suit} as it is not their turn.")
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
        current_hand = self._current_hands[self._current_player].export_hand(hint_level)
        if self._game_state == QuantumGameState.TARGET_PLAYER:
            return [i for i in range(self._number_of_players) if i not in current_hand.does_not_have_suit]
        elif self._game_state == QuantumGameState.RESPONSE:
            # Legal responses for the targeted player
            if self._current_target_player is None or self._current_target_suit is None:
                raise ValueError("Cannot get available moves in response state without a target player and suit.")
            if current_hand.suits.get(self._current_target_suit, 0) > 0:
                return [True]
            can_have_suit = (
                self._current_target_suit not in current_hand.does_not_have_suit
                and current_hand.suits.get(UNKNOWN_SUIT, 0) > 0
            )
            if can_have_suit:
                return [True, False]
            else:
                return [False]

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
        }

    @property
    def _current_player(self) -> int:
        return (self._move_number - 1) % self._number_of_players

    @property
    def move_number(self) -> int:
        return self._move_number

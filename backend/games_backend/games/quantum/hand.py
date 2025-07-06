import copy
from typing import Self, override

from games_backend.games.quantum.constants import CARDS_PER_SUIT, DEFAULT_HAND_SIZE, UNKNOWN_SUIT
from games_backend.games.quantum.exceptions import ContradictionError
from games_backend.games.quantum.models import QuantumHandState
from games_backend.models import QuantumHintLevel


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
                total_cards=self.total_cards,
                suits={UNKNOWN_SUIT: self.total_cards},
                does_not_have_suit=set(),
            )
        if hint_level == QuantumHintLevel.TRACK:
            return QuantumHandState(
                total_cards=self.total_cards,
                suits=self.declared_cards,
                does_not_have_suit=self.suits_not_available,
            )
        if hint_level == QuantumHintLevel.FULL:
            return QuantumHandState(
                total_cards=self.total_cards,
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

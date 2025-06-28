import pytest

from games_backend.games.quantum.logic import UNKNOWN_SUIT, ContradictionError, QuantumHand


@pytest.mark.parametrize("number_of_suits", [1, 2, 3, 5, 10])
def test_initial_state(number_of_suits: int):
    hand = QuantumHand(number_of_suits)

    assert hand.total_cards == 4
    assert hand.suits_not_available == set()

    inferred = hand.inferred_cards
    assert inferred[UNKNOWN_SUIT] == 4
    for suit in range(number_of_suits):
        assert inferred[suit] == 0

    # Check that inferred and declared cards are not the same object.
    hand._inferred_cards[0] = 1  # Modify inferred cards
    assert hand._declared_cards[0] == 0  # Declared cards should remain unchanged


@pytest.mark.parametrize("number_of_suits", [2, 3, 4])
@pytest.mark.parametrize("suit", [0, 1])
def test_add_card_valid_suit(number_of_suits: int, suit: int):
    hand = QuantumHand(number_of_suits)
    hand.add_card(suit)

    inferred = hand.inferred_cards
    assert inferred[suit] == 1
    assert inferred[UNKNOWN_SUIT] == 4  # Unknown stays the same since we added a card
    assert hand.total_cards == 5  # Total increases to 5


@pytest.mark.parametrize("number_of_suits", [3])
def test_add_multiple_cards_same_suit(number_of_suits: int):
    hand = QuantumHand(number_of_suits)
    hand.add_card(0)
    hand.add_card(0)
    hand.add_card(1)

    inferred = hand.inferred_cards
    assert inferred[0] == 2
    assert inferred[1] == 1
    assert inferred[UNKNOWN_SUIT] == 4  # Unknown stays the same
    assert hand.total_cards == 7  # Started with 4, added 3


def test_add_invalid_suit_raises_error():
    hand = QuantumHand(3)

    with pytest.raises(ValueError, match="Invalid suit -1"):
        hand.add_card(UNKNOWN_SUIT)

    with pytest.raises(ValueError, match="Invalid suit 3"):
        hand.add_card(3)


@pytest.mark.parametrize("number_of_suits", [2, 3, 4])
def test_remove_card_with_inferred_cards(number_of_suits: int):
    hand = QuantumHand(number_of_suits)
    hand.add_card(0)  # Now have 5 total cards
    hand.remove_card(0)  # Remove the added card

    inferred = hand.inferred_cards
    assert inferred[0] == 0
    assert inferred[UNKNOWN_SUIT] == 4
    assert hand.total_cards == 4  # Back to original


def test_remove_card_from_unknown_when_no_inferred():
    hand = QuantumHand(3)
    hand.remove_card(1)  # No cards of suit 1, should take from unknown

    inferred = hand.inferred_cards
    assert inferred[1] == 0
    assert inferred[UNKNOWN_SUIT] == 3
    assert hand.total_cards == 3


def test_remove_card_from_unavailable_suit_raises_error():
    hand = QuantumHand(3)
    hand.does_not_have_suit(1)

    with pytest.raises(ContradictionError, match="Cannot remove card from suit 1 as it is known to be unavailable"):
        hand.remove_card(1)


def test_remove_card_when_not_available_raises_error():
    hand = QuantumHand(3)
    # Remove all unknown cards
    for _ in range(4):
        hand.remove_card(0)

    with pytest.raises(ContradictionError, match="Cannot remove card from suit 0 as it is known to be unavailable."):
        hand.remove_card(0)


@pytest.mark.parametrize("number_of_suits", [2, 3, 4])
@pytest.mark.parametrize("suit", [0, 1])
def test_request_suit_from_unknown(number_of_suits: int, suit: int):
    hand = QuantumHand(number_of_suits)
    hand.request_suit(suit)

    inferred = hand.inferred_cards
    assert inferred[suit] == 1
    assert inferred[UNKNOWN_SUIT] == 3
    assert hand.total_cards == 4


def test_request_suit_when_already_have_inferred():
    hand = QuantumHand(3)
    hand.request_suit(0)  # Get 1 of suit 0 from unknown
    initial_inferred = hand.inferred_cards

    hand.request_suit(0)  # Should NOT change anything since we already have inferred cards

    inferred = hand.inferred_cards
    assert inferred[0] == initial_inferred[0] == 1  # Should stay the same
    assert inferred[UNKNOWN_SUIT] == initial_inferred[UNKNOWN_SUIT] == 3  # Should stay the same


def test_request_unavailable_suit_raises_error():
    hand = QuantumHand(3)
    hand.does_not_have_suit(1)

    with pytest.raises(ContradictionError, match="Cannot request suit 1 as it is known to be unavailable"):
        hand.request_suit(1)


def test_request_suit_when_no_unknown_cards_raises_error():
    hand = QuantumHand(5)
    # Remove all unknown cards first
    for _ in range(4):
        hand.remove_card(0)  # Remove from unknown

    # Now try to request a suit when no unknowns left
    with pytest.raises(ContradictionError, match="Cannot request suit"):
        hand.request_suit(1)


@pytest.mark.parametrize("number_of_suits", [2, 3, 4])
@pytest.mark.parametrize("suit", [0, 1])
def test_mark_suit_unavailable(number_of_suits: int, suit: int):
    hand = QuantumHand(number_of_suits)
    hand.does_not_have_suit(suit)

    assert suit in hand.suits_not_available


def test_mark_suit_unavailable_twice_is_safe():
    hand = QuantumHand(3)
    hand.does_not_have_suit(1)
    hand.does_not_have_suit(1)  # Should not raise error

    assert 1 in hand.suits_not_available


def test_mark_suit_with_inferred_cards_unavailable_raises_error():
    hand = QuantumHand(3)
    hand.add_card(1)

    with pytest.raises(ContradictionError, match="Cannot mark suit 1 as unavailable as it has inferred cards"):
        hand.does_not_have_suit(1)


def test_update_inferred_cards_valid():
    hand = QuantumHand(3)
    new_inferred = {0: 1, 1: 2, 2: 0, UNKNOWN_SUIT: 1}
    hand.update_inferred_cards(new_inferred)

    inferred = hand.inferred_cards
    assert inferred == new_inferred


def test_update_inferred_cards_wrong_total_raises_error():
    hand = QuantumHand(3)
    new_inferred = {0: 1, 1: 2, 2: 0, UNKNOWN_SUIT: 2}  # Total = 5, should be 4

    with pytest.raises(ValueError, match="Total number of inferred cards does not match the total number of cards"):
        hand.update_inferred_cards(new_inferred)


def test_update_inferred_cards_increase_unknown_raises_error():
    hand = QuantumHand(3)
    hand.add_card(0)  # Now have 1 of suit 0, 4 unknown, 5 total
    new_inferred = {0: 0, 1: 0, 2: 0, UNKNOWN_SUIT: 5}  # Trying to increase unknown from 4 to 5

    with pytest.raises(ValueError, match="Cannot increase the number of unknown cards"):
        hand.update_inferred_cards(new_inferred)


def test_update_inferred_cards_decrease_known_raises_error():
    hand = QuantumHand(3)
    hand.add_card(0)
    hand.add_card(1)  # Have 1 of each suit 0 and 1, 4 unknown, 6 total

    new_inferred = {0: 0, 1: 1, 2: 1, UNKNOWN_SUIT: 4}  # Total 6, trying to decrease suit 0 from 1 to 0

    with pytest.raises(ValueError, match="Cannot decrease the number of cards for suit 0"):
        hand.update_inferred_cards(new_inferred)


def test_copy_creates_independent_instance():
    hand = QuantumHand(3)
    hand.add_card(0)
    hand.does_not_have_suit(1)

    hand_copy = hand.copy()

    # Modify original
    hand.add_card(2)

    # Copy should be unchanged
    original_inferred = hand.inferred_cards
    copy_inferred = hand_copy.inferred_cards

    assert original_inferred[2] == 1
    assert copy_inferred[2] == 0
    assert copy_inferred[0] == 1
    assert 1 in hand_copy.suits_not_available


def test_realistic_game_scenario():
    """Test a realistic sequence of operations during a quantum go fish game"""
    hand = QuantumHand(4)  # 4 suits game

    # Player requests suit 0 (they must have at least one)
    hand.request_suit(0)
    inferred = hand.inferred_cards
    assert inferred[0] == 1
    assert inferred[UNKNOWN_SUIT] == 3

    # Player gets a card of suit 0 from another player
    hand.add_card(0)
    inferred = hand.inferred_cards
    assert inferred[0] == 2
    assert inferred[UNKNOWN_SUIT] == 3
    assert hand.total_cards == 5  # Total increased

    # Player is told they don't have suit 2
    hand.does_not_have_suit(2)
    assert 2 in hand.suits_not_available

    # Game deduction reduces uncertainty - total cards is now 5
    hand.update_inferred_cards({0: 2, 1: 1, 2: 0, 3: 1, UNKNOWN_SUIT: 1})
    inferred = hand.inferred_cards
    assert inferred[1] == 1
    assert inferred[3] == 1
    assert inferred[UNKNOWN_SUIT] == 1

    # Player gives away a card of suit 0
    hand.remove_card(0)
    inferred = hand.inferred_cards
    assert inferred[0] == 1
    assert hand.total_cards == 4  # Back to 4 after removing


@pytest.mark.parametrize(
    "operations",
    [
        # Test different sequences of operations
        [("add", 0), ("add", 1), ("request", 2), ("remove", 0)],
        [("request", 0), ("request", 1), ("does_not_have", 2), ("add", 0)],
        [("add", 0), ("add", 0), ("add", 1), ("remove", 0)],
    ],
)
def test_operation_sequences_maintain_invariants(operations):
    """Test that various operation sequences maintain hand invariants"""
    hand = QuantumHand(3)

    for op, suit in operations:
        try:
            if op == "add":
                hand.add_card(suit)
            elif op == "request":
                hand.request_suit(suit)
            elif op == "remove":
                hand.remove_card(suit)
            elif op == "does_not_have":
                hand.does_not_have_suit(suit)

            # Check invariants after each operation
            inferred = hand.inferred_cards
            assert sum(inferred.values()) == hand.total_cards
            assert all(count >= 0 for count in inferred.values())

        except ValueError:
            # Some operations may fail, that's expected
            pass

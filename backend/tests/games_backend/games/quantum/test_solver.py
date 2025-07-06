import pytest

from games_backend.games.quantum.constants import UNKNOWN_SUIT
from games_backend.games.quantum.hand import QuantumHand
from games_backend.games.quantum.solver import get_hand_solution


@pytest.mark.parametrize("number_of_players", [2, 3, 4, 5, 6, 7, 8])
def test_initial_game_state_is_solvable(number_of_players: int):
    # Computationally this is the hardest case as there are no restrictions.
    hands = {player: QuantumHand(number_of_players) for player in range(number_of_players)}

    solution = get_hand_solution(hands)

    assert solution.has_solution

    assert solution.minimum_requirements == {
        player: {suit: 0 for suit in range(number_of_players)} for player in range(number_of_players)
    }


@pytest.mark.parametrize("number_of_players", [2, 3])
def test_completely_determined_game_is_solvable(number_of_players: int):
    """Test that a fully determined game state has exactly one solution."""
    hands = {}
    for player in range(number_of_players):
        hand = QuantumHand(number_of_players)
        # Use update_inferred_cards to set exact state: 4 of own suit, 0 of others
        inferred_state = {suit: 0 for suit in range(number_of_players)}
        inferred_state[player] = 4
        inferred_state[UNKNOWN_SUIT] = 0
        hand.update_inferred_cards(inferred_state)
        hands[player] = hand

    solution = get_hand_solution(hands)

    assert solution.has_solution

    assert solution.minimum_requirements == {
        player: {suit: 4 if player == suit else 0 for suit in range(number_of_players)}
        for player in range(number_of_players)
    }


def test_logically_invalid_game_has_no_solutions():
    """
    We make a logically invalid state:
    Player 1: has 1 card of suit 1,
    Player 2 & 3: Have no cards of suit 0.
    There are no places for all the 0 suits to go, as only 3 can be with player 1.
    """
    hands: dict[int, QuantumHand] = {}
    hand0 = QuantumHand(3)
    hand0.request_suit(1)
    hands[0] = hand0

    for player in [1, 2]:
        hand = QuantumHand(3)
        hand.does_not_have_suit(0)
        hands[player] = hand

    solutions = get_hand_solution(hands)

    # Should have no solutions (impossible to distribute 4 cards of suit 0)
    assert not solutions.has_solution


def test_logical_deduction():
    """
    Player 2 & 3 have no cards of suit 0. So they must be with player 1.
    """
    hands: dict[int, QuantumHand] = {}
    hand0 = QuantumHand(3)
    hands[0] = hand0

    for player in [1, 2]:
        hand = QuantumHand(3)
        hand.does_not_have_suit(0)
        hands[player] = hand

    solutions = get_hand_solution(hands)

    assert solutions.has_solution
    assert solutions.minimum_requirements == {0: {0: 4, 1: 0, 2: 0}, 1: {0: 0, 1: 0, 2: 0}, 2: {0: 0, 1: 0, 2: 0}}

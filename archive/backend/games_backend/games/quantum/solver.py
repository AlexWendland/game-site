import numpy as np
import pydantic
from scipy.optimize import Bounds, LinearConstraint, milp

from games_backend.games.quantum.constants import CARDS_PER_SUIT, UNKNOWN_SUIT
from games_backend.games.quantum.hand import QuantumHand


class SolutionResult(pydantic.BaseModel):
    """
    Result of solving a quantum go fish game state.

    Args:
        has_solution: If there exists a solution to the problem
        minimum_requirements: For each player and suit, the minimum number of cards
                            they must have across all valid solutions
    """

    has_solution: bool
    minimum_requirements: dict[int, dict[int, int]]


def get_hand_solution(hands: dict[int, QuantumHand]) -> SolutionResult:
    """
    Determine if the current game state has valid solutions and calculate minimum requirements.

    Args:
        hands: Mapping from player number to their QuantumHand

    Returns:
        SolutionResult: Saying if the solution is solvable and the minimum card requirements
    """
    if not hands:
        return SolutionResult(has_solution=False, minimum_requirements={})

    number_of_players = len(hands)

    bound = _calculate_bounds(hands, number_of_players)
    constraints = _calculate_constraints(hands, number_of_players)
    integrality = np.array([1] * (number_of_players * number_of_players))

    min_requirements = {
        player: {suit: CARDS_PER_SUIT for suit in range(number_of_players)} for player in range(number_of_players)
    }

    # For each player and suit, calculate the solution which has the minimum number of cards for that player and suit.
    for player in range(number_of_players):
        for suit in range(number_of_players):
            player_suit_index = player * number_of_players + suit
            minimiser = np.array([0] * (number_of_players * number_of_players))
            minimiser[player_suit_index] = 1
            result = milp(c=minimiser, constraints=constraints, bounds=bound, integrality=integrality)
            if not result.success:
                return SolutionResult(has_solution=False, minimum_requirements={})
            min_requirements[player][suit] = int(result.x[player_suit_index])

    return SolutionResult(has_solution=True, minimum_requirements=min_requirements)


def _calculate_bounds(hands: dict[int, QuantumHand], number_of_players: int) -> Bounds:
    """
    We have 1 variable for each player and each suit. We bound this by the following:
    1. Each player has at least their minimum deduced cards for each suit
    2. Each player has at most their deduced + unknown cards for each suit
    3. Each suit variable has at most 4 cards in total.

    Note: In Quantum Go Fish, number of suits equals number of players.
    """
    lower_bound: list[int] = []
    upper_bound: list[int] = []

    for player, player_hand in hands.items():
        unknown_cards = player_hand.inferred_cards[UNKNOWN_SUIT]

        for suit in range(number_of_players):
            if suit in player_hand.suits_not_available:
                lower_bound.append(0)
                upper_bound.append(0)
                continue

            current_count = player_hand.inferred_cards.get(suit, 0)
            lower_bound.append(current_count)
            upper_bound.append(min(CARDS_PER_SUIT, current_count + unknown_cards))

    return Bounds(lb=np.array(lower_bound), ub=np.array(upper_bound))


def _calculate_constraints(hands: dict[int, QuantumHand], number_of_players: int) -> LinearConstraint:
    """
    We apply the following constraints to the problem:
    1. Each player has exactly their total_cards number of cards
    2. Each suit has exactly CARDS_PER_SUIT cards total across all players
    """
    total_cards = [hand.total_cards for hand in hands.values()]
    bound = np.array(total_cards + [CARDS_PER_SUIT] * number_of_players)
    array_values: list[list[int]] = []
    # Constraint: Each player has exactly their total cards
    for player in range(number_of_players):
        constraint: list[int] = []
        for iterated_player in range(number_of_players):
            constraint += [0] * number_of_players if iterated_player != player else [1] * number_of_players
        array_values.append(constraint)

    # Constraint: Each suit has exactly CARDS_PER_SUIT cards total
    for suit in range(number_of_players):
        suit_selector = [1 if suit == iterated_suit else 0 for iterated_suit in range(number_of_players)]
        array_values.append(suit_selector * number_of_players)

    return LinearConstraint(A=np.array(array_values), lb=bound, ub=bound)

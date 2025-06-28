import pytest

from games_backend.games.quantum.logic import (
    UNKNOWN_SUIT,
    ContradictionError,
    QuantumGameState,
    QuantumHand,
    QuantumLogic,
    _calculate_game_solutions,
    _calculate_minimum_requirements,
    get_hand_solution,
)


@pytest.mark.parametrize("number_of_players", [2, 3, 4])
def test_initial_game_state_is_solvable(number_of_players: int):
    """Test that the initial game state has valid solutions."""
    hands = {player: QuantumHand(number_of_players) for player in range(number_of_players)}

    solutions = _calculate_game_solutions(hands, number_of_players)

    # Should have many solutions in initial state
    assert len(solutions) > 0

    # Each solution should assign exactly 4 cards per suit
    for solution in solutions:
        suit_totals = {suit: 0 for suit in range(number_of_players)}
        for (player, suit), count in solution.items():
            suit_totals[suit] += count

        for suit_total in suit_totals.values():
            assert suit_total == 4


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

        # Mark all other suits as unavailable
        for suit in range(number_of_players):
            if suit != player:
                hand.does_not_have_suit(suit)
        hands[player] = hand

    solutions = _calculate_game_solutions(hands, number_of_players)

    # Should have exactly one solution
    assert len(solutions) == 1

    # Solution should match our setup
    solution = solutions[0]
    for player in range(number_of_players):
        assert solution[(player, player)] == 4
        for suit in range(number_of_players):
            if suit != player:
                assert (player, suit) not in solution


def test_logically_invalid_game_has_no_solutions():
    hands = {}

    hand0 = QuantumHand(3)
    hand0.remove_card(0)
    for _ in range(3):
        hand0.add_card(0)
    hands[0] = hand0

    for player in [1, 2]:
        hand = QuantumHand(3)
        hand.does_not_have_suit(0)
        hands[player] = hand

    solutions = _calculate_game_solutions(hands, 3)

    # Should have no solutions (impossible to distribute 4 cards of suit 0)
    assert len(solutions) == 0


@pytest.mark.parametrize("number_of_players", [2, 3, 4])
def test_calculate_minimum_requirements_initial_state(number_of_players: int):
    """Test minimum requirements calculation for initial game state."""
    hands = {player: QuantumHand(number_of_players) for player in range(number_of_players)}

    solutions = _calculate_game_solutions(hands, number_of_players)
    min_reqs = _calculate_minimum_requirements(solutions, number_of_players)

    # In initial state, minimum should be 0 for all player/suit combinations
    for player in range(number_of_players):
        for suit in range(number_of_players):
            assert min_reqs[player][suit] == 0


def test_calculate_minimum_requirements_determined_game():
    """Test minimum requirements for a completely determined game."""
    number_of_players = 2
    hands = {}

    # Player 0 has all cards of suit 0, Player 1 has all cards of suit 1
    for player in range(number_of_players):
        hand = QuantumHand(number_of_players)
        # Use update_inferred_cards to set exact state: 4 of own suit, 0 of others
        inferred_state = {suit: 0 for suit in range(number_of_players)}
        inferred_state[player] = 4
        inferred_state[UNKNOWN_SUIT] = 0
        hand.update_inferred_cards(inferred_state)

        # Mark all other suits as unavailable
        for suit in range(number_of_players):
            if suit != player:
                hand.does_not_have_suit(suit)
        hands[player] = hand

    solutions = _calculate_game_solutions(hands, number_of_players)
    min_reqs = _calculate_minimum_requirements(solutions, number_of_players)

    # Each player must have exactly 4 of their suit, 0 of others
    for player in range(number_of_players):
        for suit in range(number_of_players):
            if suit == player:
                assert min_reqs[player][suit] == 4
            else:
                assert min_reqs[player][suit] == 0


def test_calculate_minimum_requirements_empty_solutions():
    """Test minimum requirements with no solutions."""
    min_reqs = _calculate_minimum_requirements([], 3)

    assert min_reqs == {}


@pytest.mark.parametrize("number_of_players", [2, 3])
def test_is_hand_solvable_initial_state(number_of_players: int):
    """Test is_hand_solvable integration for initial game state."""
    hands = {player: QuantumHand(number_of_players) for player in range(number_of_players)}

    result = get_hand_solution(hands)

    assert result.number_of_solutions > 0
    assert len(result.minimum_requirements) == number_of_players

    # All minimums should be 0 in initial state
    for player in range(number_of_players):
        for suit in range(number_of_players):
            assert result.minimum_requirements[player][suit] == 0


def test_is_hand_solvable_impossible_state():
    """Test is_hand_solvable integration for impossible game state."""
    # Same impossible setup as earlier test
    hands = {}

    hand0 = QuantumHand(3)
    hand0.remove_card(0)
    for _ in range(3):
        hand0.add_card(0)
    hands[0] = hand0

    for player in [1, 2]:
        hand = QuantumHand(3)
        hand.does_not_have_suit(0)
        hands[player] = hand

    result = get_hand_solution(hands)

    assert result.number_of_solutions == 0
    assert result.minimum_requirements == {}


@pytest.mark.parametrize("number_of_players", [2, 3])
def test_partial_information_game_state(number_of_players: int):
    hands = {}

    hand0 = QuantumHand(number_of_players)
    hand0.request_suit(0)
    hands[0] = hand0

    for player in range(1, number_of_players):
        hands[player] = QuantumHand(number_of_players)

    solutions = _calculate_game_solutions(hands, number_of_players)
    min_reqs = _calculate_minimum_requirements(solutions, number_of_players)

    assert len(solutions) > 0

    assert min_reqs[0][0] >= 1

    result = get_hand_solution(hands)
    assert result.number_of_solutions == len(solutions)
    assert result.minimum_requirements[0][0] >= 1


def test_explanation_game_of_go_fish_early_exit():
    """This game is written up in the following blog post as the sample game:

    https://arstechnica.com/science/2022/04/try-your-hand-at-quantum-go-fish/

    Xia -> player 0
    Yael -> player 1
    Zoe -> player 2

    Narwhales -> suit 0
    Scruples -> suit 1
    Qualms -> suit 2

    Here we take an easy win by Xia as explained in the blog post.
    """
    game_logic = QuantumLogic(3)
    game_logic.target_player(0, 1, 0)  # Yael, do you have any Narwhales?
    game_logic.respond_to_target(1, False)  # No
    game_logic.claim_no_win(0)
    game_logic.target_player(1, 2, 1)  # Zoe, do you have any Scruples?
    game_logic.respond_to_target(2, True)  # Yes
    game_logic.claim_no_win(1)
    game_logic.target_player(2, 1, 2)  # Yael, do you have any Qualms?
    with pytest.raises(ContradictionError):
        # Can't say no as then Yael must have 5 Scruples.
        game_logic.respond_to_target(1, False)
    game_logic.respond_to_target(1, True)
    game_logic.claim_no_win(2)
    game_logic.target_player(0, 2, 0)  # Zoe, do you have any Narwhales?
    game_logic.respond_to_target(2, False)
    # Both Yael and Zoe do not have Narwhales, so they must be in Xia's hand.
    game_logic.claim_own_a_suit(0, 0)
    assert game_logic._winner == 0
    assert game_logic._game_state == QuantumGameState.FINISHED


def test_explanation_game_of_go_fish_full_game():
    """This game is written up in the following blog post as the sample game:

    https://arstechnica.com/science/2022/04/try-your-hand-at-quantum-go-fish/

    Xia -> player 0
    Yael -> player 1
    Zoe -> player 2

    Narwhales -> suit 0
    Scruples -> suit 1
    Qualms -> suit 2
    """
    game_logic = QuantumLogic(3)
    game_logic.target_player(0, 1, 0)  # Yael, do you have any Narwhales?
    game_logic.respond_to_target(1, False)  # No
    game_logic.claim_no_win(0)
    game_logic.target_player(1, 2, 1)  # Zoe, do you have any Scruples?
    game_logic.respond_to_target(2, True)  # Yes
    game_logic.claim_no_win(1)
    game_logic.target_player(2, 1, 2)  # Yael, do you have any Qualms?
    with pytest.raises(ContradictionError):
        # Can't say no as then Yael must have 5 Scruples.
        game_logic.respond_to_target(1, False)
    game_logic.respond_to_target(1, True)
    game_logic.claim_no_win(2)
    game_logic.target_player(0, 2, 0)  # Zoe, do you have any Narwhales?
    game_logic.respond_to_target(2, True)
    game_logic.claim_no_win(0)
    game_logic.target_player(1, 0, 2)  # Xia, do you have any Qualms?
    game_logic.respond_to_target(0, True)
    game_logic.claim_no_win(1)
    game_logic.target_player(2, 0, 1)  # Xia, do you have any Scruples?
    with pytest.raises(ContradictionError):
        # Can't have scruples as Yael has 3 already.
        game_logic.respond_to_target(0, True)
    game_logic.respond_to_target(0, False)
    game_logic.claim_all_suits_determined(
        2,
        {
            0: {0: 4, 1: 0, 2: 0},
            1: {0: 0, 1: 3, 2: 2},
            2: {0: 0, 1: 1, 2: 2},
        },
    )
    assert game_logic._winner == 2
    assert game_logic._game_state == QuantumGameState.FINISHED


def test_explanation_game_of_go_fish_alternate_end():
    """This game is written up in the following blog post as the sample game:

    https://arstechnica.com/science/2022/04/try-your-hand-at-quantum-go-fish/

    Xia -> player 0
    Yael -> player 1
    Zoe -> player 2

    Narwhales -> suit 0
    Scruples -> suit 1
    Qualms -> suit 2

    Here Zoe takes another winning move, this time asking Yael for Scruples instead of Xia.
    """
    game_logic = QuantumLogic(3)
    game_logic.target_player(0, 1, 0)  # Yael, do you have any Narwhales?
    game_logic.respond_to_target(1, False)  # No
    game_logic.claim_no_win(0)
    game_logic.target_player(1, 2, 1)  # Zoe, do you have any Scruples?
    game_logic.respond_to_target(2, True)  # Yes
    game_logic.claim_no_win(1)
    game_logic.target_player(2, 1, 2)  # Yael, do you have any Qualms?
    with pytest.raises(ContradictionError):
        # Can't say no as then Yael must have 5 Scruples.
        game_logic.respond_to_target(1, False)
    game_logic.respond_to_target(1, True)
    game_logic.claim_no_win(2)
    game_logic.target_player(0, 2, 0)  # Zoe, do you have any Narwhales?
    game_logic.respond_to_target(2, True)
    game_logic.claim_no_win(0)
    game_logic.target_player(1, 0, 2)  # Xia, do you have any Qualms?
    game_logic.respond_to_target(0, True)
    game_logic.claim_no_win(1)
    game_logic.target_player(2, 1, 1)  # Yeal, do you have any Scruples?
    with pytest.raises(ContradictionError):
        # Has scruples, so can't say no.
        game_logic.respond_to_target(1, False)
    game_logic.respond_to_target(1, True)
    game_logic.claim_all_suits_determined(
        2,
        {
            0: {0: 4, 1: 0, 2: 0},
            1: {0: 0, 1: 2, 2: 2},
            2: {0: 0, 1: 2, 2: 2},
        },
    )
    assert game_logic._winner == 2
    assert game_logic._game_state == QuantumGameState.FINISHED


def test_invalid_player_ids():
    """Test that invalid player IDs are rejected."""
    game = QuantumLogic(3)

    # Test negative player ID
    with pytest.raises(ValueError, match="Invalid player -1"):
        game.target_player(-1, 1, 0)

    # Test player ID too high
    with pytest.raises(ValueError, match="Invalid player 3"):
        game.target_player(3, 1, 0)

    # Test in other methods
    with pytest.raises(ValueError, match="Invalid player 5"):
        game._validate_player(5)


def test_invalid_suit_ids():
    """Test that invalid suit IDs are rejected."""
    game = QuantumLogic(3)

    # Test negative suit
    with pytest.raises(ValueError, match="Invalid suit -1"):
        game.target_player(0, 1, -1)

    # Test suit too high
    with pytest.raises(ValueError, match="Invalid suit 3"):
        game.target_player(0, 1, 3)


def test_wrong_game_state_actions():
    """Test that actions in wrong game states are rejected."""
    game = QuantumLogic(3)

    # Try to respond when in TARGET_PLAYER state
    with pytest.raises(ValueError, match="Cannot respond to target in current game state"):
        game.respond_to_target(1, True)

    # Try to claim win when in TARGET_PLAYER state
    with pytest.raises(ValueError, match="Cannot claim win in current game state"):
        game.claim_no_win(0)

    # Try to claim suit when in TARGET_PLAYER state
    with pytest.raises(ValueError, match="Cannot claim own suit in current game state"):
        game.claim_own_a_suit(0, 0)


def test_wrong_turn_actions():
    """Test that players can't act when it's not their turn."""
    game = QuantumLogic(3)

    # Player 1 tries to target when it's player 0's turn
    with pytest.raises(ValueError, match="Player 1 cannot target player 2 as it is not their turn"):
        game.target_player(1, 2, 0)

    # Set up for response testing
    game.target_player(0, 1, 0)

    # Player 2 tries to respond when player 1 was targeted
    with pytest.raises(ValueError, match="Player 2 cannot respond as they have not been targeted"):
        game.respond_to_target(2, True)


def test_self_targeting():
    """Test that players cannot target themselves."""
    game = QuantumLogic(3)

    with pytest.raises(ValueError, match="Cannot target yourself"):
        game.target_player(0, 0, 0)


def test_missing_target_state():
    """Test actions when target state is incomplete."""
    game = QuantumLogic(3)
    game.target_player(0, 1, 0)

    # Manually corrupt state to test validation
    game._current_target_suit = None

    with pytest.raises(ValueError, match="No suit has been targeted yet"):
        game.respond_to_target(1, True)


def test_contradiction_scenarios():
    """Test scenarios that create contradictions."""
    game = QuantumLogic(2)

    # Create a scenario where a player must have a suit they claim not to have
    game.target_player(0, 1, 0)  # Player 0 asks player 1 for suit 0
    game.respond_to_target(1, False)  # Player 1 says no
    game.claim_no_win(0)

    game.target_player(1, 0, 1)  # Player 1 asks player 0 for suit 1
    game.respond_to_target(0, False)  # Player 0 says no
    game.claim_no_win(1)

    # Now if player 0 asks for suit 1 again, it should be a contradiction
    # since we know player 1 doesn't have suit 0 and player 0 doesn't have suit 1
    # but each suit must have 4 cards total
    with pytest.raises(ContradictionError):
        game.target_player(0, 1, 1)


def test_invalid_win_claims():
    """Test claiming wins without valid conditions."""
    game = QuantumLogic(3)

    # Set up game state to reach CLAIM_WIN
    game.target_player(0, 1, 0)
    game.respond_to_target(1, False)

    # Try to claim a suit that player doesn't have
    with pytest.raises(ContradictionError, match="Player 0 does not have a winning hand for suit 1"):
        game.claim_own_a_suit(0, 1)


def test_malformed_suit_allocations():
    """Test claim_all_suits_determined with invalid allocations."""
    game = QuantumLogic(2)

    # Set up minimal game to reach determination state
    game.target_player(0, 1, 0)
    game.respond_to_target(1, False)

    # Test with incorrect allocation
    with pytest.raises(ContradictionError, match="Claimed hand does not match"):
        game.claim_all_suits_determined(
            0,
            {
                0: {0: 3, 1: 1},  # Wrong totals
                1: {0: 1, 1: 3},
            },
        )


def test_finished_game_actions():
    """Test that actions are rejected after game finishes."""
    game = QuantumLogic(2)

    # Set up a quick win scenario
    game.target_player(0, 1, 0)
    game.respond_to_target(1, False)
    game.claim_own_a_suit(0, 0)  # Player 0 wins with all 4 suit 0 cards

    assert game._game_state == QuantumGameState.FINISHED

    # Try to take actions after game finished
    with pytest.raises(ValueError, match="Game is already finished"):
        game._progress_game()


def test_claim_win_wrong_turn():
    """Test claiming win when it's not the player's turn."""
    game = QuantumLogic(3)

    # Set up to CLAIM_WIN state for player 0
    game.target_player(0, 1, 0)
    game.respond_to_target(1, False)

    # Player 1 tries to claim win when it's player 0's turn
    with pytest.raises(ValueError, match="Player 1 cannot claim win as it is not their turn"):
        game.claim_no_win(1)

    with pytest.raises(ValueError, match="Player 1 cannot claim suit 0 as it is not their turn"):
        game.claim_own_a_suit(1, 0)


@pytest.mark.parametrize("num_players", [1, 2, 3, 4, 5])
def test_initialization_with_different_player_counts(num_players):
    """Test game initialization with different player counts."""
    game = QuantumLogic(num_players)
    assert game._number_of_players == num_players
    assert len(game._current_hands) == num_players
    assert game._current_player == 0
    assert game._game_state == QuantumGameState.TARGET_PLAYER


def test_requesting_after_claiming_unavailable():
    """Test contradiction when requesting a suit you claimed unavailable."""
    game = QuantumLogic(3)

    # Player 0 asks player 1 for suit 0, player 1 says no
    game.target_player(0, 1, 0)
    game.respond_to_target(1, False)  # Player 1 claims no suit 0
    game.claim_no_win(0)

    # Now player 1 tries to ask for suit 0 - contradiction since they claimed not to have it
    with pytest.raises(ContradictionError):
        game.target_player(1, 2, 0)  # Player 1 can't request suit 0

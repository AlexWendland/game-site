import random

import pytest

from games_backend.games.wizard.logic import WizardLogic


@pytest.mark.parametrize(
    "number_of_players",
    [3, 4, 5, 6],
)
def test_completely_random_game(number_of_players: int):
    logic = WizardLogic(number_of_players)

    rounds = logic.number_of_rounds

    # Bid in round 1 but don't play cards
    for player_index in range(number_of_players):
        game_state = logic.get_game_state(None, True)
        player = game_state.current_player
        logic.set_player_bid(
            player, random.randint(0, 1), set_suit=random.choice([0, 1, 2, 3]) if game_state.trump_to_be_set else 5
        )

    for round_number in range(2, rounds + 1):
        game_state = logic.get_game_state(None, True)
        player = game_state.current_player
        for player_to_check in range(number_of_players):
            assert len(game_state.score_sheet[player_to_check]) == round_number - 1
        # Bidding for round
        for player_index in range(number_of_players):
            game_state = logic.get_game_state(player, True)
            logic.set_player_bid(
                player,
                random.choice(game_state.valid_bids),
                set_suit=random.choice([0, 1, 2, 3]) if game_state.trump_to_be_set else 5,
            )
            player = (player + 1) % number_of_players

        # Playing cards
        for past_hands in range(round_number):
            game_state = logic.get_game_state(None, True)
            player = game_state.current_player

            for player_index in range(number_of_players):
                game_state = logic.get_game_state(player, True)
                assert len(game_state.trick_records) == past_hands
                if past_hands != round_number - 1:
                    assert (
                        len([played for played in game_state.current_trick.values() if played is not None])
                        == player_index
                    )
                else:
                    # Last hand, you can see everyone's cards.
                    assert (
                        len([played for played in game_state.current_trick.values() if played is not None])
                        == number_of_players - 1
                    )
                game_state = logic.get_game_state(player, False)
                assert len(game_state.trick_records) == min(past_hands, 1)
                logic.play_card(player, random.choice(game_state.playable_cards))
                player = (player + 1) % number_of_players

    game_state = logic.get_game_state(None, True)
    assert len(game_state.winners) > 0
    for player in range(number_of_players):
        assert len(game_state.score_sheet[player]) == rounds

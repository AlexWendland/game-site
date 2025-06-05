import copy
import random
from unittest import mock

import pytest

from games_backend.games.exceptions import GameException
from games_backend.games.wizard.logic import GameRound, _is_wizard


def test_random_game_round():
    round = GameRound(number_of_players=3, round_number=3, player_starting_tricks=0, first_bidding_player=0)

    round.set_player_bid(0, 1, set_suit=1 if _is_wizard(round.get_trump_card()) else -1)
    round.set_player_bid(1, 1, -1)
    round.set_player_bid(2, 1, -1)

    # 3 players, 3 rounds
    for _ in range(9):
        player = round.current_player
        cards = round.get_playable_cards(player)
        round.play_card(player, cards[0])

    assert round.get_bids() == {0: 1, 1: 1, 2: 1}
    assert list(round.get_trick_count().keys()) == [0, 1, 2]


def test_can_not_play_card_when_bidding():
    round = GameRound(number_of_players=3, round_number=3, player_starting_tricks=0, first_bidding_player=0)

    with pytest.raises(GameException, match="You can not play cards at this point."):
        round.play_card(0, 1)


def test_can_not_bid_when_playing():
    round = GameRound(number_of_players=3, round_number=3, player_starting_tricks=0, first_bidding_player=0)

    round.set_player_bid(0, 1, set_suit=1 if _is_wizard(round.get_trump_card()) else -1)
    round.set_player_bid(1, 1, -1)
    round.set_player_bid(2, 1, -1)

    with pytest.raises(GameException, match="Cannot bid at this time."):
        round.set_player_bid(0, 1)


def test_wizard_lets_player_set_suit():
    with mock.patch.object(random, "sample") as mock_sample, mock.patch.object(random, "choice") as mock_choice:
        mock_sample.side_effect = [[0, 1, 2], [13, 14, 15], [26, 27, 28]]
        mock_choice.return_value = 59  # Wizard
        round = GameRound(number_of_players=3, round_number=3, player_starting_tricks=0, first_bidding_player=0)

    round.set_player_bid(0, 1, 1)


def test_nara_means_no_trump_suit():
    with mock.patch.object(random, "sample") as mock_sample, mock.patch.object(random, "choice") as mock_choice:
        mock_sample.side_effect = [[0, 1, 2], [13, 14, 15], [26, 27, 28]]
        mock_choice.return_value = 55  # Nara
        round = GameRound(number_of_players=3, round_number=3, player_starting_tricks=0, first_bidding_player=0)

    round.set_player_bid(0, 1, -1)


def test_rigged_game():
    with mock.patch.object(random, "sample") as mock_sample, mock.patch.object(random, "choice") as mock_choice:
        mock_sample.side_effect = [[0, 1, 2], [13, 14, 15], [26, 27, 28]]
        mock_choice.return_value = 3
        round = GameRound(number_of_players=3, round_number=3, player_starting_tricks=0, first_bidding_player=0)

    round.set_player_bid(0, 3, -1)
    round.set_player_bid(1, 1, -1)
    round.set_player_bid(2, 0, -1)

    for round_number in range(3):
        for player in range(3):
            round.play_card(player, round_number + player * 13)

    assert round.get_bids() == {0: 3, 1: 1, 2: 0}
    assert round.get_trick_count() == {0: 3, 1: 0, 2: 0}


def test_order_of_play_is_given_by_winner():
    # These cards will be played in order
    player_cards = [
        [13, 28, 2],
        [14, 1, 39],
        [0, 27, 40],
    ]
    player_start_order = [0, 2, 1]
    trump = 3
    with mock.patch.object(random, "sample") as mock_sample, mock.patch.object(random, "choice") as mock_choice:
        mock_sample.side_effect = copy.deepcopy(player_cards)
        mock_choice.return_value = trump
        round = GameRound(number_of_players=3, round_number=3, player_starting_tricks=0, first_bidding_player=0)

    round.set_player_bid(0, 1, -1)
    round.set_player_bid(1, 1, -1)
    round.set_player_bid(2, 1, -1)

    for round_number in range(3):
        for player_index in range(3):
            player = (player_start_order[round_number] + player_index) % 3
            round.play_card(player, player_cards[player][round_number])

    assert round.get_bids() == {0: 1, 1: 1, 2: 1}
    assert round.get_trick_count() == {0: 1, 1: 1, 2: 1}

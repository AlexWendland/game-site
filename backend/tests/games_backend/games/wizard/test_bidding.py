import pytest

from games_backend.games.exceptions import GameException
from games_backend.games.wizard.logic import BiddingRound


@pytest.fixture
def bidding_round_3p_r1_p0_no_set():
    """Standard 3 players, round 1, player 0 starts, no suit setting needed."""
    return BiddingRound(
        number_of_players=3, round_number=1, starting_player=0, trump_suit=0, need_to_set_trump_suit=False
    )


@pytest.fixture
def bidding_round_3p_r5_p1_need_set():
    """3 players, round 5, player 1 starts, player 1 needs to set suit."""
    return BiddingRound(
        number_of_players=3, round_number=5, starting_player=1, trump_suit=-1, need_to_set_trump_suit=True
    )


@pytest.fixture
def bidding_round_4p_r4_p0_no_set_for_bid_summing():
    """4 players, round 4 (for dealer screw rule), player 0 starts, no suit setting."""
    return BiddingRound(
        number_of_players=4, round_number=4, starting_player=0, trump_suit=1, need_to_set_trump_suit=False
    )


def test_get_bids_returns_copy(bidding_round_3p_r1_p0_no_set: BiddingRound):
    bidding_round = bidding_round_3p_r1_p0_no_set
    bidding_round.set_player_bid(0, 1)
    bids_copy = bidding_round.get_bids()
    bids_copy[0] = 5
    assert bidding_round.get_bids()[0] == 1


def test_is_bidding_over(bidding_round_3p_r1_p0_no_set: BiddingRound):
    bidding_round = bidding_round_3p_r1_p0_no_set
    assert not bidding_round.is_bidding_over
    bidding_round.set_player_bid(0, 1)
    assert not bidding_round.is_bidding_over
    assert bidding_round._current_player == 1
    bidding_round.set_player_bid(1, 0)
    assert not bidding_round.is_bidding_over
    assert bidding_round._current_player == 2
    bidding_round.set_player_bid(2, 1)
    assert bidding_round.is_bidding_over
    assert bidding_round._bids == {0: 1, 1: 0, 2: 1}


def test_bidding_after_complete(bidding_round_3p_r1_p0_no_set: BiddingRound):
    bidding_round = bidding_round_3p_r1_p0_no_set
    bidding_round.set_player_bid(0, 1)
    bidding_round.set_player_bid(1, 0)
    bidding_round.set_player_bid(2, 1)
    assert bidding_round.is_bidding_over
    with pytest.raises(GameException, match="Bidding phase is already complete."):
        bidding_round.set_player_bid(0, 0)


def test_bid_not_current_player(bidding_round_3p_r1_p0_no_set: BiddingRound):
    bidding_round = bidding_round_3p_r1_p0_no_set
    with pytest.raises(GameException, match="It's not this player's turn to bid."):
        bidding_round.set_player_bid(1, 1)


@pytest.mark.parametrize(
    "invalid_bid, round_num",
    [
        (-1, 1),
        (2, 1),
        (6, 5),
    ],
)
def test_invalid_bid_amount(invalid_bid: int, round_num: int):
    bidding_round = BiddingRound(
        number_of_players=3, round_number=round_num, starting_player=0, trump_suit=0, need_to_set_trump_suit=False
    )
    with pytest.raises(GameException, match="Invalid bid. Must be between 0 and the round number."):
        bidding_round.set_player_bid(0, invalid_bid)


@pytest.mark.parametrize(
    "invalid_suit, message",
    [
        (-2, "Invalid suit. Must be between 0 and 3."),
        (4, "Invalid suit. Must be between 0 and 3."),
    ],
)
def test_player_trying_to_set_invalid_suit(
    bidding_round_3p_r5_p1_need_set: BiddingRound, invalid_suit: int, message: str
):
    bidding_round = bidding_round_3p_r5_p1_need_set
    assert bidding_round._player_can_set_suit
    assert bidding_round._current_player == 1
    with pytest.raises(GameException, match=message):
        bidding_round.set_player_bid(player_number=1, bid=2, set_suit=invalid_suit)


@pytest.mark.parametrize("valid_suit", [-1, 0, 1, 2, 3])
def test_player_sets_suit_successfully(bidding_round_3p_r5_p1_need_set: BiddingRound, valid_suit: int):
    bidding_round = bidding_round_3p_r5_p1_need_set
    bidding_round.set_player_bid(player_number=1, bid=1, set_suit=valid_suit)
    assert bidding_round.get_trump_suit() == valid_suit
    assert not bidding_round._player_can_set_suit
    assert bidding_round._bids[1] == 1
    assert bidding_round._current_player == 2


def test_player_cannot_set_suit_when_not_needed(bidding_round_3p_r1_p0_no_set: BiddingRound):
    bidding_round = bidding_round_3p_r1_p0_no_set
    assert not bidding_round._player_can_set_suit
    with pytest.raises(GameException, match="Player cannot set suit at this time."):
        bidding_round.set_player_bid(player_number=0, bid=1, set_suit=1)


def test_non_starting_player_cannot_set_suit_even_if_needed(bidding_round_3p_r5_p1_need_set: BiddingRound):
    bidding_round = bidding_round_3p_r5_p1_need_set
    bidding_round.set_player_bid(player_number=1, bid=2, set_suit=1)
    assert not bidding_round._player_can_set_suit
    assert bidding_round._current_player == 2

    with pytest.raises(GameException, match="Player cannot set suit at this time."):
        bidding_round.set_player_bid(player_number=2, bid=1, set_suit=0)


def test_player_bids_out_of_turn_and_sets_suit():
    bidding_round = BiddingRound(
        number_of_players=3, round_number=5, starting_player=1, trump_suit=-1, need_to_set_trump_suit=True
    )
    assert bidding_round._current_player == 1
    with pytest.raises(GameException, match="It's not this player's turn to bid."):
        bidding_round.set_player_bid(player_number=0, bid=1, set_suit=0)


def test_bid_summing_rule_does_not_apply_round_le_3():
    bidding_round = BiddingRound(
        number_of_players=3, round_number=3, starting_player=0, trump_suit=0, need_to_set_trump_suit=False
    )
    bidding_round.set_player_bid(0, 1)
    bidding_round.set_player_bid(1, 1)
    # P2 (last) bids 1. Total bids = 1+1+1 = 3. Round number = 3. Should be allowed.
    bidding_round.set_player_bid(2, 1)
    assert bidding_round._bids[2] == 1
    assert sum(bidding_round._bids.values()) == 3


def test_bid_summing_rule_applies_last_player_bid_valid(bidding_round_4p_r4_p0_no_set_for_bid_summing: BiddingRound):
    bidding_round = bidding_round_4p_r4_p0_no_set_for_bid_summing
    bidding_round.set_player_bid(0, 1)
    bidding_round.set_player_bid(1, 1)
    bidding_round.set_player_bid(2, 0)
    # P3 (last player) bids 1. Prior sum = 2. P3's bid = 1. Total = 3. Round = 4. 3 != 4. Allowed.
    bidding_round.set_player_bid(3, 1)
    assert bidding_round._bids[3] == 1
    assert sum(bidding_round._bids.values()) == 3


def test_bid_summing_rule_applies_last_player_bid_invalid(bidding_round_4p_r4_p0_no_set_for_bid_summing: BiddingRound):
    bidding_round = bidding_round_4p_r4_p0_no_set_for_bid_summing
    bidding_round.set_player_bid(0, 1)
    bidding_round.set_player_bid(1, 1)
    bidding_round.set_player_bid(2, 1)
    # P3 (last player) tries to bid 1. Prior sum = 3. P3's bid = 1. Total would be 4. Round = 4. Not allowed.
    with pytest.raises(GameException, match="Total bids can not sum to the round number after round 3."):
        bidding_round.set_player_bid(3, 1)


def test_bid_summing_rule_correct_sum_calculation():
    bidding_round = BiddingRound(
        number_of_players=3, round_number=5, starting_player=0, trump_suit=0, need_to_set_trump_suit=False
    )
    bidding_round.set_player_bid(0, 2)
    bidding_round.set_player_bid(1, 2)
    with pytest.raises(GameException, match="Total bids can not sum to the round number after round 3."):
        bidding_round.set_player_bid(2, 1)
    bidding_round.set_player_bid(2, 0)
    assert bidding_round._bids[2] == 0


def test_full_bidding_cycle_and_state_updates():
    bidding_round = BiddingRound(
        number_of_players=3, round_number=2, starting_player=0, trump_suit=1, need_to_set_trump_suit=False
    )

    assert bidding_round._current_player == 0
    assert not bidding_round.is_bidding_over
    bidding_round.set_player_bid(0, 1)
    assert bidding_round._bids == {0: 1}
    assert bidding_round._current_player == 1
    assert not bidding_round.is_bidding_over
    assert bidding_round.get_trump_suit() == 1

    bidding_round.set_player_bid(1, 0)
    assert bidding_round._bids == {0: 1, 1: 0}
    assert bidding_round._current_player == 2
    assert not bidding_round.is_bidding_over
    assert bidding_round.get_trump_suit() == 1

    bidding_round.set_player_bid(2, 1)
    assert bidding_round._bids == {0: 1, 1: 0, 2: 1}
    assert bidding_round._current_player == 0
    assert bidding_round.is_bidding_over
    assert bidding_round.get_trump_suit() == 1


def test_bidding_flow_with_suit_setting():
    bidding_round = BiddingRound(
        number_of_players=3, round_number=4, starting_player=1, trump_suit=-1, need_to_set_trump_suit=True
    )

    assert bidding_round._current_player == 1
    assert bidding_round._player_can_set_suit
    bidding_round.set_player_bid(player_number=1, bid=1, set_suit=3)
    assert bidding_round._bids == {1: 1}
    assert bidding_round.get_trump_suit() == 3
    assert not bidding_round._player_can_set_suit
    assert bidding_round._current_player == 2
    assert not bidding_round.is_bidding_over

    bidding_round.set_player_bid(player_number=2, bid=2)
    assert bidding_round._bids == {1: 1, 2: 2}
    assert bidding_round.get_trump_suit() == 3
    assert bidding_round._current_player == 0
    assert not bidding_round.is_bidding_over

    bidding_round.set_player_bid(player_number=0, bid=2)
    assert bidding_round._bids == {1: 1, 2: 2, 0: 2}
    assert bidding_round.get_trump_suit() == 3
    assert bidding_round._current_player == 1
    assert bidding_round.is_bidding_over

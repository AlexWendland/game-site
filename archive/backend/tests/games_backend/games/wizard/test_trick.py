import pytest

from games_backend.games.exceptions import GameException
from games_backend.games.wizard.logic import Trick

# --- Card Constants for Tests (makes tests more readable) ---
# Suits: Red (0), Blue (1), Green (2), Yellow (3)
R0, R5, R12 = 0, 5, 12
B0, B5, B12 = 13, 18, 25
G0, G5, G12 = 26, 31, 38
Y0, Y5, Y12 = 39, 44, 51
RED, BLUE, GREEN, YELLOW = 0, 1, 2, 3

N0, N1, N2, N3 = 52, 53, 54, 55
W0, W1, W2, W3 = 56, 57, 58, 59


@pytest.fixture
def trick_3p_p0_lead_trump_red():
    """3 players, P0 leads, Trump is Red (0)."""
    return Trick(player_number=3, leading_player=0, trump_suit=0)  # Trump Red


@pytest.fixture
def trick_4p_p1_lead_trump_blue():
    """4 players, P1 leads, Trump is Blue (1)."""
    return Trick(player_number=4, leading_player=1, trump_suit=1)  # Trump Blue


@pytest.fixture
def trick_3p_p0_lead_no_trump():
    """3 players, P0 leads, No Trump (-1)."""
    return Trick(player_number=3, leading_player=0, trump_suit=-1)


def test_has_player_played_card(trick_3p_p0_lead_trump_red: Trick):
    trick = trick_3p_p0_lead_trump_red
    assert not trick._has_player_played_card(0)
    trick.play_card(0, R5, [R5, B5])
    assert trick._has_player_played_card(0)
    assert not trick._has_player_played_card(1)
    assert trick._leading_suit == 0
    assert not trick._leading_suit_still_to_play


@pytest.mark.parametrize(
    "card_played, expected_leading_suit, expected_still_to_play",
    [
        (R5, RED, False),
        (B12, BLUE, False),
        (G0, GREEN, False),
        (Y12, YELLOW, False),
        (N0, -1, True),  # Nara leads, no suit established, still to play
        (W0, -1, False),  # Wizard leads, no suit established, anyone can play anything
    ],
)
def test_set_leading_suit_first_card(
    card_played: int, expected_leading_suit: int, expected_still_to_play: bool, trick_3p_p0_lead_trump_red: Trick
):
    trick = trick_3p_p0_lead_trump_red
    trick.play_card(0, card_played, [card_played])
    assert trick._leading_suit == expected_leading_suit
    assert trick._leading_suit_still_to_play == expected_still_to_play


def test_set_leading_suit_after_nara():
    trick = Trick(player_number=3, leading_player=0, trump_suit=0)
    trick.play_card(0, N0, [N0])
    assert trick._leading_suit == -1
    assert trick._leading_suit_still_to_play is True
    trick.play_card(1, N1, [N1])
    assert trick._leading_suit == -1
    assert trick._leading_suit_still_to_play is True
    trick.play_card(2, R5, [R5])
    assert trick._leading_suit == RED
    assert trick._leading_suit_still_to_play is False


def test_set_leading_suit_not_updated_if_already_set_by_suit():
    trick = Trick(player_number=3, leading_player=0, trump_suit=0)
    trick.play_card(0, R5, [R5, B5])
    assert trick._leading_suit == RED
    assert trick._leading_suit_still_to_play is False

    trick.play_card(1, B0, [B0, B12])
    assert trick._leading_suit == RED
    assert trick._leading_suit_still_to_play is False


def test_get_playable_cards_player_already_played(trick_3p_p0_lead_trump_red: Trick):
    trick = trick_3p_p0_lead_trump_red
    trick.play_card(0, R5, [R5, B5])
    assert trick.get_playable_cards([B5], player_number=0) == []


def test_get_playable_cards_first_player(trick_3p_p0_lead_trump_red: Trick):
    trick = trick_3p_p0_lead_trump_red
    hand = [R5, B5, W0, N0]
    assert sorted(trick.get_playable_cards(hand, player_number=0)) == sorted(hand)


def test_get_playable_cards_must_follow_suit_has_suit(trick_3p_p0_lead_trump_red: Trick):
    trick = trick_3p_p0_lead_trump_red
    trick.play_card(0, R5, [R5, G5, R12])
    hand_p1 = [R0, B5, W0]
    assert sorted(trick.get_playable_cards(hand_p1, player_number=1)) == sorted([R0, W0])


def test_get_playable_cards_must_follow_suit_has_only_leading_suit(trick_3p_p0_lead_trump_red: Trick):
    trick = trick_3p_p0_lead_trump_red
    trick.play_card(0, B5, [B5, R0, R12])
    hand_p1 = [B0, B12, G0]
    assert sorted(trick.get_playable_cards(hand_p1, player_number=1)) == sorted([B0, B12])


def test_get_playable_cards_cannot_follow_suit(trick_3p_p0_lead_trump_red: Trick):
    trick = trick_3p_p0_lead_trump_red
    trick.play_card(0, R5, [R5, W1, N1, R12, R0])
    hand_p1 = [B0, G5, Y12, W0, N0]
    assert sorted(trick.get_playable_cards(hand_p1, player_number=1)) == sorted(hand_p1)


def test_get_playable_cards_nara_led_next_player_can_play_anything(trick_3p_p0_lead_trump_red: Trick):
    trick = trick_3p_p0_lead_trump_red
    trick.play_card(0, N0, [N0, R0, Y12])
    hand_p1 = [R5, B5, W0]
    assert sorted(trick.get_playable_cards(hand_p1, player_number=1)) == sorted(hand_p1)


def test_play_card_not_current_player(trick_3p_p0_lead_trump_red: Trick):
    trick = trick_3p_p0_lead_trump_red
    with pytest.raises(GameException, match="It's not this player's turn to play a card."):
        trick.play_card(1, B5, [B5])


def test_play_card_trick_over(trick_3p_p0_lead_trump_red: Trick):
    trick = trick_3p_p0_lead_trump_red
    trick.play_card(0, R0, [R0, B0])
    trick.play_card(1, R5, [R5, B5])
    trick.play_card(2, R12, [R12, B12])
    assert trick.winner is not None
    with pytest.raises(GameException, match="Trick is already over. No more cards can be played."):
        trick.play_card(0, B0, [B0])


def test_play_card_player_does_not_have_card(trick_3p_p0_lead_trump_red: Trick):
    trick = trick_3p_p0_lead_trump_red
    with pytest.raises(GameException, match=f"Player does not have card {B5}."):
        trick.play_card(0, B5, [R0, R5])


def test_play_card_not_playable(trick_3p_p0_lead_trump_red: Trick):
    trick = trick_3p_p0_lead_trump_red
    trick.play_card(0, R5, [R5, B0])
    with pytest.raises(GameException, match=f"Player can not play {B0} as it is not playable."):
        trick.play_card(1, B0, [R0, B0])


# --- _determine_winner Tests ---
# Format: (cards_played_dict, leading_player, trump_suit, expected_winner)
# cards_played_dict: {player_id: card}

WINNER_TEST_CASES = {
    # Wizards
    "Wizard wins (first played)": ({0: W0, 1: R5, 2: B5}, 0, 0, 0),
    "Wizard wins (second played)": ({0: R5, 1: W0, 2: B5}, 0, 0, 1),
    "Wizard wins (multiple wizards, first one)": ({0: R5, 1: W1, 2: W0}, 0, 0, 1),
    "Wizard wins (with nara)": ({1: W0, 2: N0, 0: B5}, 1, 0, 1),
    # Trumps (Trump is Red = 0)
    "Trump wins (single trump)": ({0: B5, 1: R5, 2: G5}, 0, 0, 1),
    "Trump wins (highest trump)": ({0: B5, 1: R0, 2: R5}, 0, 0, 2),
    "Trump wins (leader plays trump)": ({0: R5, 1: B0, 2: B5}, 0, 0, 0),
    "Trump wins (wizard played after trump - wizard wins)": ({0: R5, 1: W0, 2: B5}, 0, 0, 1),
    # Leading Suit (Trump is Blue = 1, or No Trump = -1)
    "Leading suit wins (no trump, no wizard)": ({0: R5, 1: R0, 2: R12}, 0, 1, 2),
    "Leading suit wins (trump exists but not played)": ({0: R5, 1: R0, 2: G0}, 0, 1, 0),
    "Leading suit wins (leader is P1)": ({1: G5, 2: G0, 0: G12}, 1, 0, 0),
    # All Naras (or no determining cards)
    "All Naras - leader wins": ({0: N0, 1: N1, 2: N2}, 0, 0, 0),
    "Naras and one off-suit (Nara led) - leader wins": ({0: N0, 1: N1, 2: B5}, 0, 0, 2),
    "Nara led, then suit, then off-suit - suit wins": ({0: N0, 1: R5, 2: Y5}, 0, 1, 1),
    "Nara led, then Red, then Blue (Trump Blue) -> Blue wins": ({0: N0, 1: R5, 2: B5}, 0, 1, 2),
    # Mixed scenarios
    "Leading suit beaten by trump": ({0: R12, 1: B0, 2: R0}, 0, 1, 1),
    "Wizard beats trump": ({0: W0, 1: R12, 2: B5}, 0, 0, 0),
    "Wizard Led, others play non-trump suits - Wizard wins": ({0: W0, 1: R5, 2: G5}, 0, 1, 0),
    "All Wizards, first played wins": ({0: W0, 1: W1, 2: W2}, 0, -1, 0),
    "All Wizards, p1 leads, first played wins": ({1: W0, 2: W1, 0: W2}, 1, -1, 1),
    "Wizard beats Wizard by play order 1": ({0: R0, 1: W0, 2: W1}, 0, 0, 1),
    "Wizard beats Wizard by play order 2": ({1: R0, 2: W0, 0: W1}, 1, 0, 2),
}


@pytest.mark.parametrize(
    "cards_played, leading_player, trump_suit, expected_winner",
    list(WINNER_TEST_CASES.values()),
    ids=list(WINNER_TEST_CASES.keys()),
)
def test_determine_winner_scenarios(
    cards_played: dict[int, int], leading_player: int, trump_suit: int, expected_winner: int
):
    num_players = len(cards_played)
    trick = Trick(player_number=num_players, leading_player=leading_player, trump_suit=trump_suit)
    for player_index in range(num_players):
        player = (leading_player + player_index) % num_players
        trick.play_card(player, cards_played[player], [cards_played[player]])
    assert trick._determine_winner() == expected_winner


def test_get_record_before_trick_over(trick_3p_p0_lead_trump_red: Trick):
    trick = trick_3p_p0_lead_trump_red
    trick.play_card(0, R5, [R5])
    with pytest.raises(GameException, match="Trick is not yet complete. No winner has been determined."):
        trick.get_record()


def test_get_record_success(trick_3p_p0_lead_trump_red: Trick):
    trick = trick_3p_p0_lead_trump_red
    hand_p0, hand_p1, hand_p2 = [R5, B0], [G5, R0], [Y5, R12]

    trick.play_card(0, R5, hand_p0)
    trick.play_card(1, R0, hand_p1)
    trick.play_card(2, R12, hand_p2)

    assert trick.winner == 2
    record = trick.get_record()
    assert record.cards_played == {0: R5, 1: R0, 2: R12}
    assert record.leading_player == 0
    assert record.leading_suit == RED
    assert record.winner == 2

    record.cards_played[0] = W0
    assert trick._cards_played[0] == R5


def test_full_trick_simulation_wizard_lead(trick_3p_p0_lead_no_trump: Trick):
    trick = trick_3p_p0_lead_no_trump
    hand_p0, hand_p1, hand_p2 = [W0, R0], [B5, G5], [Y5, R5]

    trick.play_card(0, W0, hand_p0)
    trick.play_card(1, B5, hand_p1)
    trick.play_card(2, Y5, hand_p2)

    record = trick.get_record()
    assert record.winner == 0
    assert record.cards_played == {0: W0, 1: B5, 2: Y5}
    assert record.leading_suit == -1


def test_full_trick_simulation_nara_lead_then_suit(trick_3p_p0_lead_trump_red: Trick):
    trick = trick_3p_p0_lead_trump_red
    hand_p0, hand_p1, hand_p2 = [N0, B0], [B5, G5], [Y5, R5]

    trick.play_card(0, N0, hand_p0)
    trick.play_card(1, B5, hand_p1)
    trick.play_card(2, R5, hand_p2)

    record = trick.get_record()
    assert record.winner == 2
    assert record.cards_played == {0: N0, 1: B5, 2: R5}
    assert record.leading_suit == 1

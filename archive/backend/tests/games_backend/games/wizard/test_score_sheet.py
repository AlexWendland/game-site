from games_backend.games.wizard.logic import ScoreSheet
from games_backend.games.wizard.models import RoundResult


def test_score_sheet():
    score_sheet = ScoreSheet(3)

    # Round 1
    score_sheet.add_round_result(0, 1, 1, 0)
    score_sheet.add_round_result(1, 1, 0, 0)
    score_sheet.add_round_result(2, 1, 1, 1)

    assert score_sheet.get_player_score(0) == -10
    assert score_sheet.get_player_score(1) == 20
    assert score_sheet.get_player_score(2) == 30

    assert score_sheet.get_player_round_result(0, 1) == RoundResult(bid=1, tricks_won=0, score=-10)
    assert score_sheet.get_player_round_result(1, 1) == RoundResult(bid=0, tricks_won=0, score=20)
    assert score_sheet.get_player_round_result(2, 1) == RoundResult(bid=1, tricks_won=1, score=30)

    # Round 2
    score_sheet.add_round_result(0, 2, 2, 1)
    score_sheet.add_round_result(1, 2, 0, 0)
    score_sheet.add_round_result(2, 2, 1, 1)

    assert score_sheet.get_player_score(0) == -20
    assert score_sheet.get_player_score(1) == 40
    assert score_sheet.get_player_score(2) == 60

    assert score_sheet.get_player_round_result(0, 2) == RoundResult(bid=2, tricks_won=1, score=-10)
    assert score_sheet.get_player_round_result(1, 2) == RoundResult(bid=0, tricks_won=0, score=20)
    assert score_sheet.get_player_round_result(2, 2) == RoundResult(bid=1, tricks_won=1, score=30)

    # Round 3
    score_sheet.add_round_result(0, 3, 0, 0)
    score_sheet.add_round_result(1, 3, 2, 2)
    score_sheet.add_round_result(2, 3, 1, 1)

    assert score_sheet.get_player_score(0) == 0
    assert score_sheet.get_player_score(1) == 80
    assert score_sheet.get_player_score(2) == 90

    assert score_sheet.get_player_round_result(0, 3) == RoundResult(bid=0, tricks_won=0, score=20)
    assert score_sheet.get_player_round_result(1, 3) == RoundResult(bid=2, tricks_won=2, score=40)
    assert score_sheet.get_player_round_result(2, 3) == RoundResult(bid=1, tricks_won=1, score=30)

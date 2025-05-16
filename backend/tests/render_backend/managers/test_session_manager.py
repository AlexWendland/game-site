import uuid

import pytest

from games_backend import models
from games_backend.manager.session_manager import SessionManager

# -------------------------------------
# SessionManager tests
# -------------------------------------

@pytest.fixture
def session() -> SessionManager:
    return SessionManager(max_players=3)


def test_add_and_get_client_position(session: SessionManager):
    client_id = str(uuid.uuid4())
    session.add_client(client_id, "Alice")
    assert session.get_client_position(client_id) is None


def test_move_client_position(session: SessionManager):
    client_id = str(uuid.uuid4())
    session.add_client(client_id, "Bob")
    session._move_client_position(client_id, 1)
    assert session.get_client_position(client_id) == 1
    assert session._get_positions()[1] == "Bob"
    session._move_client_position(client_id, 2)
    assert session.get_client_position(client_id) == 2
    assert session._get_positions()[1] is None
    assert session._get_positions()[2] == "Bob"


def test_position_conflict(session: SessionManager):
    c1, c2 = str(uuid.uuid4()), str(uuid.uuid4())
    session.add_client(c1, "One")
    session.add_client(c2, "Two")
    session._move_client_position(c1, 0)
    with pytest.raises(ValueError):
        session._move_client_position(c2, 0)


def test_remove_client(session: SessionManager):
    client_id = str(uuid.uuid4())
    session.add_client(client_id, "Alice")
    session._move_client_position(client_id, 1)
    session.remove_client(client_id)
    assert client_id not in session._player_names
    assert client_id not in session._player_to_position
    assert session._get_positions()[1] is None


def test_get_positions(session: SessionManager):
    client_id_1, client_id_2 = str(uuid.uuid4()), str(uuid.uuid4())
    session.add_client(client_id_1, "Alpha")
    session.add_client(client_id_2, "Beta")
    session._move_client_position(client_id_1, 0)
    session._move_client_position(client_id_2, 1)
    positions = session._get_positions()
    assert positions[0] == "Alpha"
    assert positions[1] == "Beta"


def test_invalid_client_operations(session: SessionManager):
    client_id = str(uuid.uuid4())
    with pytest.raises(ValueError):
        session.get_client_position(client_id)
    with pytest.raises(ValueError):
        session._move_client_position(client_id, 0)
    with pytest.raises(ValueError):
        session.remove_client(client_id)
    with pytest.raises(ValueError):
        session._set_client_name(client_id, "Other name")


def test_get_positions_with_name_change(session: SessionManager):
    client_id_1, client_id_2 = str(uuid.uuid4()), str(uuid.uuid4())
    session.add_client(client_id_1, "Alpha")
    session.add_client(client_id_2, "Beta")
    session._move_client_position(client_id_1, 0)
    session._move_client_position(client_id_2, 1)
    session._set_client_name(client_id_1, "Charlie")
    positions = session._get_positions()
    assert positions[0] == "Charlie"
    assert positions[1] == "Beta"


def test_set_player_name(session: SessionManager):
    client_id = str(uuid.uuid4())
    session.add_client(client_id)

    response = session.handle_function_call(client_id, "set_player_name", {"player_name": "Alice"})
    assert response is None
    assert session._player_names[client_id] == "Alice"


def test_set_player_name_invalid(session: SessionManager):
    client_id = str(uuid.uuid4())
    session.add_client(client_id)

    response = session.handle_function_call(client_id, "set_player_name", {"player_name": 123})
    assert isinstance(response, models.ErrorResponse)
    assert "Parameter validation failed" in response.parameters.error_message


def test_set_player_position(session: SessionManager):
    client_id = str(uuid.uuid4())
    session.add_client(client_id)

    response = session.handle_function_call(client_id, "set_player_position", {"new_position": 1})
    assert response is None
    assert session.get_client_position(client_id) == 1
    assert session._position_to_player[1] == client_id


def test_set_player_position_already_taken(session: SessionManager):
    client_id_1, client_id_2 = str(uuid.uuid4()), str(uuid.uuid4())
    session.add_client(client_id_1)
    session.add_client(client_id_2)

    session.handle_function_call(client_id_1, "set_player_position", {"new_position": 1})
    response = session.handle_function_call(client_id_2, "set_player_position", {"new_position": 1})

    assert isinstance(response, models.ErrorResponse)
    assert "already taken" in response.parameters.error_message


def test_set_player_position_invalid(session: SessionManager):
    client_id = str(uuid.uuid4())
    session.add_client(client_id)

    response = session.handle_function_call(client_id, "set_player_position", {"new_position": "one"})
    assert isinstance(response, models.ErrorResponse)
    assert "Parameter validation failed" in response.parameters.error_message


def test_leave_player_position(session: SessionManager):
    client_id = str(uuid.uuid4())
    session.add_client(client_id)
    session.handle_function_call(client_id, "set_player_position", {"new_position": 0})

    response = session.handle_function_call(client_id, "leave_player_position", {})
    assert response is None
    assert session.get_client_position(client_id) is None
    assert session._position_to_player[0] is None


def test_unknown_function_name(session: SessionManager):
    client_id = str(uuid.uuid4())
    session.add_client(client_id)

    response = session.handle_function_call(client_id, "do_nothing", {})
    assert isinstance(response, models.ErrorResponse)
    assert "not supported" in response.parameters.error_message

from typing import Self, override
from unittest.mock import Mock

import pytest

from games_backend import models
from games_backend.manager.session_manager import SessionManager

# -------------------------------------
# SessionManager tests
# -------------------------------------


class DummyWebSocket:
    def __init__(self, client_id: str):
        self.client = client_id  # Simulate .client attribute for logging
        self.client_id = client_id

    @override
    def __hash__(self):
        return hash(self.client_id)

    @override
    def __eq__(self, other: Self):
        return isinstance(other, DummyWebSocket) and self.client_id == other.client_id


@pytest.fixture
def session() -> SessionManager:
    return SessionManager(max_players=3)


def test_add_and_get_client_position(session: SessionManager):
    client = Mock()
    session.add_client(client, "Alice")
    assert session.get_client_position(client) is None


def test_move_client_position(session: SessionManager):
    client = Mock()
    session.add_client(client, "Bob")
    session._move_client_position(client, 1)
    assert session.get_client_position(client) == 1
    assert session._get_positions()[1] == "Bob"
    session._move_client_position(client, 2)
    assert session.get_client_position(client) == 2
    assert session._get_positions()[1] is None
    assert session._get_positions()[2] == "Bob"


def test_position_conflict(session: SessionManager):
    c1, c2 = Mock(), Mock()
    session.add_client(c1, "One")
    session.add_client(c2, "Two")
    session._move_client_position(c1, 0)
    with pytest.raises(ValueError):
        session._move_client_position(c2, 0)


def test_remove_client(session: SessionManager):
    client = Mock()
    session.add_client(client, "Alice")
    session._move_client_position(client, 1)
    session.remove_client(client)
    assert client not in session._player_names
    assert client not in session._player_to_position
    assert session._get_positions()[1] is None


def test_get_positions(session: SessionManager):
    c1, c2 = Mock(), Mock()
    session.add_client(c1, "Alpha")
    session.add_client(c2, "Beta")
    session._move_client_position(c1, 0)
    session._move_client_position(c2, 1)
    positions = session._get_positions()
    assert positions[0] == "Alpha"
    assert positions[1] == "Beta"


def test_invalid_client_operations(session: SessionManager):
    fake = Mock()
    with pytest.raises(ValueError):
        session.get_client_position(fake)
    with pytest.raises(ValueError):
        session._move_client_position(fake, 0)
    with pytest.raises(ValueError):
        session.remove_client(fake)
    with pytest.raises(ValueError):
        session._set_client_name(fake, "Other name")


def test_get_positions_with_name_change(session: SessionManager):
    c1, c2 = Mock(), Mock()
    session.add_client(c1, "Alpha")
    session.add_client(c2, "Beta")
    session._move_client_position(c1, 0)
    session._move_client_position(c2, 1)
    session._set_client_name(c1, "Charlie")
    positions = session._get_positions()
    assert positions[0] == "Charlie"
    assert positions[1] == "Beta"


def test_set_player_name(session: SessionManager):
    client = DummyWebSocket("c1")
    session.add_client(client)

    response = session.handle_function_call(client, "set_player_name", {"player_name": "Alice"})
    assert response is None
    assert session._player_names[client] == "Alice"


def test_set_player_name_invalid(session: SessionManager):
    client = DummyWebSocket("c1")
    session.add_client(client)

    response = session.handle_function_call(client, "set_player_name", {"player_name": 123})
    assert isinstance(response, models.ErrorResponse)
    assert "Parameter validation failed" in response.parameters.error_message


def test_set_player_position(session: SessionManager):
    client = DummyWebSocket("c1")
    session.add_client(client)

    response = session.handle_function_call(client, "set_player_position", {"new_position": 1})
    assert response is None
    assert session.get_client_position(client) == 1
    assert session._position_to_player[1] == client


def test_set_player_position_already_taken(session: SessionManager):
    client1 = DummyWebSocket("c1")
    client2 = DummyWebSocket("c2")
    session.add_client(client1)
    session.add_client(client2)

    session.handle_function_call(client1, "set_player_position", {"new_position": 1})
    response = session.handle_function_call(client2, "set_player_position", {"new_position": 1})

    assert isinstance(response, models.ErrorResponse)
    assert "already taken" in response.parameters.error_message


def test_set_player_position_invalid(session: SessionManager):
    client = DummyWebSocket("c1")
    session.add_client(client)

    response = session.handle_function_call(client, "set_player_position", {"new_position": "one"})
    assert isinstance(response, models.ErrorResponse)
    assert "Parameter validation failed" in response.parameters.error_message


def test_leave_player_position(session: SessionManager):
    client = DummyWebSocket("c1")
    session.add_client(client)
    session.handle_function_call(client, "set_player_position", {"new_position": 0})

    response = session.handle_function_call(client, "leave_player_position", {})
    assert response is None
    assert session.get_client_position(client) is None
    assert session._position_to_player[0] is None


def test_unknown_function_name(session: SessionManager):
    client = DummyWebSocket("c1")
    session.add_client(client)

    response = session.handle_function_call(client, "do_nothing", {})
    assert isinstance(response, models.ErrorResponse)
    assert "not supported" in response.parameters.error_message

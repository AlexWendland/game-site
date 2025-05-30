from typing import override
from unittest.mock import AsyncMock

import pytest

from games_backend import models
from games_backend.ai_base import GameAI
from games_backend.manager.ai_manager import AIManager


class MockGameAI(GameAI):
    def __init__(self, position: int, name: str):
        super().__init__(position, name)
        self.id = f"ai_{position}"

    @override
    @classmethod
    def get_ai_type(cls) -> str:
        return "MockAI"

    @override
    def update_game_state(self, game_state: models.GameStateResponse) -> None | models.WebSocketRequest:
        pass


class AnotherMockGameAI(GameAI):
    def __init__(self, position: int, name: str):
        super().__init__(position, name)
        self.id = f"another_ai_{position}"

    @override
    @classmethod
    def get_ai_type(cls) -> str:
        return "AnotherAI"

    @override
    def update_game_state(self, game_state: models.GameStateResponse) -> None | models.WebSocketRequest:
        pass


MOCK_MODELS: dict[str, type[GameAI]] = {"MockAI": MockGameAI, "AnotherAI": AnotherMockGameAI}


@pytest.fixture
def fresh_manager():
    mock_add_ai = AsyncMock(side_effect=["A", "B", "C", "D"])
    mock_act_as_ai = AsyncMock()
    mock_remove_ai = AsyncMock()
    return AIManager(
        game_models=MOCK_MODELS,
        add_ai=mock_add_ai,
        act_as_ai=mock_act_as_ai,
        remove_ai=mock_remove_ai,
    )


@pytest.mark.asyncio
async def test_add_ai_player(fresh_manager: AIManager):
    mock_client = "ABCD"

    response = await fresh_manager.handle_function_call(mock_client, "add_ai", {"ai_model": "MockAI", "position": 1})
    assert response is None
    assert "A" in fresh_manager._ai_instances
    assert isinstance(fresh_manager._ai_instances["A"], MockGameAI)

    response = await fresh_manager.handle_function_call(mock_client, "add_ai", {"ai_model": "AnotherAI", "position": 2})
    assert response is None
    assert "B" in fresh_manager._ai_instances
    assert isinstance(fresh_manager._ai_instances["B"], AnotherMockGameAI)


@pytest.mark.asyncio
async def test_remove_ai_player(fresh_manager: AIManager):
    mock_client = "ABCD"

    await fresh_manager.handle_function_call(mock_client, "add_ai", {"ai_model": "MockAI", "position": 1})
    assert "A" in fresh_manager._ai_instances

    response = await fresh_manager.handle_function_call(mock_client, "remove_ai", {"position": 1})
    assert response is None
    assert fresh_manager._ai_instances == {}


@pytest.mark.asyncio
async def test_remove_ai_player_not_found(fresh_manager: AIManager):
    mock_client = "ABCD"

    response = await fresh_manager.handle_function_call(mock_client, "remove_ai", {"position": 1})
    assert isinstance(response, models.ErrorResponse)
    assert response.parameters.error_message == "No AI found in position 1."
    assert fresh_manager._ai_instances == {}


@pytest.mark.asyncio
async def test_add_ai_player_in_spot_that_is_already_filled():
    mock_add_ai = AsyncMock()

    def side_effect(ai_instance: GameAI):
        ai_instance._position = None
        return "A"

    mock_add_ai.side_effect = side_effect
    mock_act_as_ai = AsyncMock()
    mock_remove_ai = AsyncMock()

    manager = AIManager(
        game_models=MOCK_MODELS,
        add_ai=mock_add_ai,
        act_as_ai=mock_act_as_ai,
        remove_ai=mock_remove_ai,
    )

    mock_client = "ABCD"
    response = await manager.handle_function_call(mock_client, "add_ai", {"ai_model": "MockAI", "position": 1})
    assert isinstance(response, models.ErrorResponse)
    assert response.parameters.error_message == "AI instance A did not set its position."
    assert manager._ai_instances == {}


@pytest.mark.asyncio
async def test_serialise_and_deserialise_manager():
    mock_add_ai = AsyncMock()
    mock_add_ai.side_effect = ["A", "B"]
    mock_act_as_ai = AsyncMock()
    mock_remove_ai = AsyncMock()

    ai_manager = AIManager(
        game_models=MOCK_MODELS,
        add_ai=mock_add_ai,
        act_as_ai=mock_act_as_ai,
        remove_ai=mock_remove_ai,
    )
    mock_client = "ABCD"
    await ai_manager.handle_function_call(mock_client, "add_ai", {"ai_model": "MockAI", "position": 1})
    await ai_manager.handle_function_call(mock_client, "add_ai", {"ai_model": "AnotherAI", "position": 2})

    serialised = ai_manager.serialise_manager()
    assert serialised == {1: "MockAI", 2: "AnotherAI"}

    # Reset mocks for deserialization
    mock_add_ai.side_effect = ["A", "B"]
    mock_act_as_ai.reset_mock()
    mock_remove_ai.reset_mock()

    new_manager = await AIManager.from_serialised_manager(
        game_models=MOCK_MODELS,
        add_ai=mock_add_ai,
        act_as_ai=mock_act_as_ai,
        remove_ai=mock_remove_ai,
        serialise_manager=serialised,
    )

    assert new_manager._ai_instances == ai_manager._ai_instances

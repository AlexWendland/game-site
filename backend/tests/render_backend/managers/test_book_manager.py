from unittest.mock import AsyncMock, MagicMock

import pytest

from games_backend.manager.book_manager import BookManager
from games_backend.manager.db_manager import InMemoryDBManager


@pytest.fixture
def book_manager():
    db = InMemoryDBManager()
    return BookManager(db_manager=db)


@pytest.fixture
def mock_game_manager() -> MagicMock:
    game_manager = MagicMock()
    game_manager.close_game = AsyncMock()
    return game_manager

@pytest.mark.asyncio
async def test_add_and_get_game(book_manager: BookManager, mock_game_manager: MagicMock):
    game_id = "game1"
    book_manager.add_game(game_id, mock_game_manager)
    retrieved = await book_manager.get_game(game_id)
    assert retrieved == mock_game_manager


def test_add_duplicate_game_raises(book_manager: BookManager, mock_game_manager: MagicMock):
    game_id = "game1"
    book_manager.add_game(game_id, mock_game_manager)
    with pytest.raises(KeyError, match="already exists"):
        book_manager.add_game(game_id, mock_game_manager)

@pytest.mark.asyncio
async def test_get_nonexistent_game_raises(book_manager: BookManager):
    with pytest.raises(KeyError, match=r"no_such_game"):
        _ = await book_manager.get_game("no_such_game")


@pytest.mark.asyncio
async def test_remove_game(book_manager: BookManager, mock_game_manager: MagicMock):
    game_id = "game1"
    book_manager.add_game(game_id, mock_game_manager)
    await book_manager.remove_game(game_id)
    mock_game_manager.close_game.assert_awaited_once()
    assert game_id not in await book_manager.get_all_game_ids()

@pytest.mark.asyncio
async def test_get_all_game_ids(book_manager: BookManager, mock_game_manager: MagicMock):
    ids = {"a", "b", "c"}
    for game_id in ids:
        book_manager.add_game(game_id, mock_game_manager)
    assert await book_manager.get_all_game_ids() == ids

import asyncio
import contextlib
import os
from collections.abc import AsyncIterator
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException, WebSocket
from fastapi.middleware.cors import CORSMiddleware

from games_backend import models
from games_backend.app_logger import logger
from games_backend.game_base import GameBase
from games_backend.games.quantum.game import QuantumGame
from games_backend.games.tictactoe import TicTacToeGame
from games_backend.games.topological_connect_four.game import TopologicalGame
from games_backend.games.ultimate import UltimateGame
from games_backend.games.wizard.game import WizardGame
from games_backend.manager.book_manager import BookManager
from games_backend.manager.db_manager import InMemoryDBManager
from games_backend.manager.game_manager import GameManager
from games_backend.utils import validated_game_name


@contextlib.asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    db_manager = InMemoryDBManager()
    app.state.book_manager = BookManager(db_manager=db_manager)
    logger.info("Book manager created.")
    # TODO: Enable auditing of games in the future
    # _ = asyncio.create_task(audit_book_manager(app.state.book_manager))
    yield
    await app.state.book_manager.graceful_close()


async def audit_book_manager(book_manager: BookManager):
    while not book_manager.is_closed:
        await asyncio.sleep(60)
        await book_manager.audit_games()


app = FastAPI(lifespan=lifespan)

origins = [
    os.getenv("FRONTEND_URL", "http://localhost:3000"),
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_book_manager() -> BookManager:
    """
    Dependency to get the book manager.
    """
    return app.state.book_manager


GAME_MAPPING: dict[models.GameType, type[GameBase]] = {
    models.GameType.TICTACTOE: TicTacToeGame,
    models.GameType.ULTIMATE: UltimateGame,
}

# -------------------------------------
# REST API
# -------------------------------------


@app.get("/")
async def root() -> models.SimpleResponse:
    return models.SimpleResponse(parameters=models.SimpleResponseParameters(message="Hello world!"))


@app.post("/new_game/tictactoe")
async def new_tic_tac_toe_game(
    book_manager: Annotated[BookManager, Depends(get_book_manager)],
) -> models.SimpleResponse:
    new_game_id = await book_manager.get_free_game_id()
    game = TicTacToeGame()
    game_manager = GameManager.from_game_and_id(new_game_id, game)
    book_manager.add_game(new_game_id, game_manager)
    logger.info(f"New game of Tic Tac Toe created: {new_game_id}")
    return models.SimpleResponse(parameters=models.SimpleResponseParameters(message=new_game_id))


@app.post("/new_game/ultimate")
async def new_ultimate_game(
    book_manager: Annotated[BookManager, Depends(get_book_manager)],
) -> models.SimpleResponse:
    new_game_id = await book_manager.get_free_game_id()
    game = UltimateGame()
    game_manager = GameManager.from_game_and_id(new_game_id, game)
    book_manager.add_game(new_game_id, game_manager)
    logger.info(f"New game of Ultimate Tic Tac Toe created: {new_game_id}")
    return models.SimpleResponse(parameters=models.SimpleResponseParameters(message=new_game_id))


@app.post("/new_game/topological")
async def new_topological_game(
    book_manager: Annotated[BookManager, Depends(get_book_manager)],
    new_game_parameters: models.TopologicalNewGameRequest,
) -> models.SimpleResponse:
    new_game_id = await book_manager.get_free_game_id()
    game = TopologicalGame(
        max_players=new_game_parameters.number_of_players,
        board_size=new_game_parameters.board_size,
        gravity=new_game_parameters.gravity,
        geometry=new_game_parameters.geometry,
    )
    game_manager = GameManager.from_game_and_id(new_game_id, game)
    book_manager.add_game(new_game_id, game_manager)
    logger.info(f"New game of Topological Connect Four created: {new_game_id}\nWith parameters:\n{new_game_parameters}")
    return models.SimpleResponse(parameters=models.SimpleResponseParameters(message=new_game_id))


@app.post("/new_game/wizard")
async def new_wizard_game(
    book_manager: Annotated[BookManager, Depends(get_book_manager)],
    new_game_parameters: models.WizardNewGameRequest,
) -> models.SimpleResponse:
    new_game_id = await book_manager.get_free_game_id()
    game = WizardGame(
        number_of_players=new_game_parameters.number_of_players,
        can_see_old_rounds=new_game_parameters.show_old_rounds,
    )
    game_manager = GameManager.from_game_and_id(new_game_id, game)
    book_manager.add_game(new_game_id, game_manager)
    logger.info(f"New game of Wizard created: {new_game_id}\nWith parameters:\n{new_game_parameters}")
    return models.SimpleResponse(parameters=models.SimpleResponseParameters(message=new_game_id))


@app.post("/new_game/quantum")
async def new_quantum_game(
    book_manager: Annotated[BookManager, Depends(get_book_manager)],
    new_game_parameters: models.QuantumNewGameRequest,
) -> models.SimpleResponse:
    new_game_id = await book_manager.get_free_game_id()
    game = QuantumGame(
        number_of_players=new_game_parameters.number_of_players, max_hint_level=new_game_parameters.max_hint_level
    )
    game_manager = GameManager.from_game_and_id(new_game_id, game)
    book_manager.add_game(new_game_id, game_manager)
    logger.info(f"New game of Quantum created: {new_game_id}\nWith parameters:\n{new_game_parameters}")
    return models.SimpleResponse(parameters=models.SimpleResponseParameters(message=new_game_id))


@app.get("/game/{game_name}/models")
async def get_game_models(
    game_name: Annotated[str, Depends(validated_game_name)],
    book_manager: Annotated[BookManager, Depends(get_book_manager)],
) -> models.ModelResponse:
    try:
        game_models = await book_manager.get_game_models(game_name)
    except ValueError:
        logger.info(f"Game {game_name} not found.")
        raise HTTPException(status_code=404, detail=f"Game {game_name} not found")
    logger.info(f"Game models for {game_name} obtained.")
    return models.ModelResponse(parameters=models.ModelResponseParameters(models=game_models))


@app.get("/game/{game_name}/metadata")
async def get_game_metadata(
    game_name: Annotated[str, Depends(validated_game_name)],
    book_manager: Annotated[BookManager, Depends(get_book_manager)],
) -> models.GameMetadataUnion:
    """
    Get the game state for a given game name.
    """
    try:
        metadata = await book_manager.get_game_metadata(game_name)
    except ValueError:
        logger.info(f"Game {game_name} not found.")
        raise HTTPException(status_code=404, detail=f"Game {game_name} not found")
    logger.info(f"Game metadata for {game_name} obtained.")
    return metadata


# -------------------------------------
# Websocket API
# -------------------------------------


@app.websocket("/game/{game_name}/ws")
async def websocket_endpoint(
    game_name: Annotated[str, Depends(validated_game_name)],
    client_websocket: WebSocket,
    book_manager: Annotated[BookManager, Depends(get_book_manager)],
):
    game = await book_manager.get_game(game_name)
    await game.handle_connection(client_websocket)

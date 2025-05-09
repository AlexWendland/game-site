import contextlib
import os
from collections.abc import AsyncIterator
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException, WebSocket
from fastapi.middleware.cors import CORSMiddleware

from games_backend import models, utils
from games_backend.app_logger import logger
from games_backend.games import TicTacToeGame, UltimateGame
from games_backend.managers import BookManager, GameManager, SessionManager


@contextlib.asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    app.state.book_manager = BookManager()
    logger.info("Book manager created.")
    yield


app = FastAPI(lifespan=lifespan)

origins = [
    os.getenv("FRONTEND_URL", "http://localhost:3000"),
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: Fix this.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def validated_game_name(game_name: str) -> str:
    if not utils.is_game_id_valid(game_name):
        logger.info(f"Invalid game requested: {game_name}")
        raise HTTPException(status_code=400, detail=f"Game name {game_name} is not valid")
    return game_name


# -------------------------------------
# REST API
# -------------------------------------


@app.get("/")
async def root() -> models.SimpleResponse:
    return models.SimpleResponse(parameters=models.SimpleResponseParameters(message="Hello world!"))


@app.post("/new_game/tictactoe")
async def new_tic_tac_toe_game() -> models.SimpleResponse:
    new_game_id = app.state.book_manager.get_free_game_id()
    game = TicTacToeGame()
    session = SessionManager(game.get_max_players())
    game_manager = GameManager(new_game_id, game, session)
    app.state.book_manager.add_game(new_game_id, game_manager)
    logger.info(f"New game of Tic Tac Toe created: {new_game_id}")
    return models.SimpleResponse(parameters=models.SimpleResponseParameters(message=new_game_id))


@app.post("/new_game/ultimate")
async def new_game() -> models.SimpleResponse:
    new_game_id = app.state.book_manager.get_free_game_id()
    game = UltimateGame()
    session = SessionManager(game.get_max_players())
    game_manager = GameManager(new_game_id, game, session)
    app.state.book_manager.add_game(new_game_id, game_manager)
    logger.info(f"New game of Ultimate Tic Tac Toe created: {new_game_id}")
    return models.SimpleResponse(parameters=models.SimpleResponseParameters(message=new_game_id))


@app.get("/game/{game_name}")
async def get_game_metadata(
    game_name: Annotated[str, Depends(validated_game_name)],
) -> models.GameMetadata:
    """
    Get the game state for a given game name.
    """
    try:
        metadata = app.state.book_manager.get_game_metadata(game_name)
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
    game_name: Annotated[str, Depends(validated_game_name)], client_websocket: WebSocket
):
    game = app.state.book_manager.get_game(game_name)
    await game.handle_connection(client_websocket)

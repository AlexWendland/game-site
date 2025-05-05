import contextlib
import os
from collections.abc import AsyncIterator
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException, WebSocket
from fastapi.middleware.cors import CORSMiddleware

from render_backend import models, utils
from render_backend.app_logger import logger
from render_backend.games import PingPongGame
from render_backend.managers import BookManager, GameManager
from render_backend.ultimate import api_functions, ultimate_models


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
# Game creation
# -------------------------------------


@app.get("/")
async def root() -> models.SimpleResponse:
    return models.SimpleResponse(parameters=models.SimpleResponseParameters(message="Hello world!"))


@app.post("/new_game")
async def new_game(new_game_request: models.NewGameRequest) -> models.SimpleResponse:
    new_game_id = api_functions.make_new_game()
    game_manager = GameManager(new_game_id, PingPongGame())
    app.state.book_manager.add_game(new_game_id, game_manager)
    logger.info(f"New game of {new_game_request.game_name} created: {new_game_id}")
    return models.SimpleResponse(parameters=models.SimpleResponseParameters(message=new_game_id))


# -------------------------------------
# Game interaction
# -------------------------------------


@app.websocket("/game/{game_name}/ws")
async def websocket_endpoint(
    game_name: Annotated[str, Depends(validated_game_name)], client_websocket: WebSocket
):
    game = app.state.book_manager.get_game(game_name)
    await game.handle_connection(client_websocket)


# -------------------------------------
# Legacy
# -------------------------------------


@app.get("/ultimate/game/{game_name}")
async def get_game(
    game_name: Annotated[str, Depends(validated_game_name)],
) -> ultimate_models.GameState:
    """
    Get the game state for a given game name.
    """
    try:
        game_state = api_functions.get_game_state(game_name)
    except KeyError:
        logger.info(f"Game {game_name} not found.")
        raise HTTPException(status_code=404, detail=f"Game {game_name} not found")
    logger.info(f"Game state for {game_name} obtained.")
    return game_state


@app.put("/ultimate/game/{game_name}/set_player")
async def set_player(
    game_name: Annotated[str, Depends(validated_game_name)], player_update: models.PlayerUpdate
) -> models.SimpleResponse:
    try:
        api_functions.set_player(
            game_name=game_name,
            player_position=player_update.player_position,
            player_name=player_update.player_name,
        )
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Game {game_name} not found")
    except ValueError:
        raise HTTPException(
            status_code=401,
            detail=f"Game {game_name} has player in position {player_update.player_position}",
        )
    return models.SimpleResponse(
        parameters=models.SimpleResponseParameters(
            message=(
                f"Player {player_update.player_name} has been set to position "
                f"{player_update.player_position} on game {game_name}"
            )
        )
    )


@app.put("/ultimate/game/{game_name}/unset_player")
async def unset_player(
    game_name: Annotated[str, Depends(validated_game_name)], player_update: models.PlayerUpdate
) -> models.SimpleResponse:
    try:
        api_functions.unset_player(
            game_name=game_name,
            player_position=player_update.player_position,
            player_name=player_update.player_name,
        )
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Game {game_name} not found")
    return models.SimpleResponse(
        parameters=models.SimpleResponseParameters(
            message=(
                f"Player {player_update.player_name} is no longer in position "
                f"{player_update.player_position} on game {game_name}."
            )
        )
    )


@app.put("/ultimate/game/{game_name}/make_move")
async def make_move(
    game_name: Annotated[str, Depends(validated_game_name)], move: models.Move
) -> models.SimpleResponse:
    try:
        api_functions.make_move(
            game_name=game_name,
            player_name=move.player_name,
            player_position=move.player_position,
            move=move.move,
        )
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Game {game_name} not found")
    except ValueError:
        raise HTTPException(status_code=401, detail=f"Move {move} is not valid")
    return models.SimpleResponse(
        parameters=models.SimpleResponseParameters(message=f"Move {move} made on game {game_name}")
    )

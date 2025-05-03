import os

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from render_backend import models
from render_backend.ultimate import api_functions, ultimate_models

app = FastAPI()

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


@app.get("/")
async def root() -> models.SimpleResponse:
    return models.SimpleResponse(message="Hello world!")

@app.get("/ultimate/new_game")
async def new_game() -> models.SimpleResponse:
    new_game = api_functions.make_new_game()
    return models.SimpleResponse(message=new_game)

@app.get("/ultimate/game/{game_name}")
async def get_game(game_name: str) -> ultimate_models.GameState:
    """
    Get the game state for a given game name.
    """
    try:
        game_state = api_functions.get_game_state(game_name)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Game {game_name} not found")
    return game_state

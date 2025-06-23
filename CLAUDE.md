# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Purpose

The following project builds a games website allowing users to play them online in a multiplayer fashion.
The games featured are children's games and the site is styled as such, childish and friendly.
This project also adds game AI, long term the plan is to use this website to learn reinforcement learning.

## Project Structure

This is a full-stack multiplayer games platform with separate frontend and backend:

- **Frontend**: Next.js 15 React app in TypeScript using Tailwind CSS
- **Backend**: FastAPI Python server using Poetry for dependency management
- **Architecture**: Real-time multiplayer games using WebSockets, in-memory database

## Development Commands

This project uses a devenv.nix file to define all of its development commands.

### Frontend (in `/frontend/`)
```bash
front-up      # Start development server with Turbopack
npm run build # Build for production  
npm run lint  # Run ESLint with auto-fix
```

### Backend (in `/backend/`)
```bash
back-up            # Start FastAPI server
pytest .           # Run all tests
ruff format .      # Format code with Ruff
ruff check . --fix # Lint code with fixes
```

## Game Architecture

### Backend Game System
All games inherit from `GameBase` (games_backend/game_base.py) which defines:
- `handle_function_call()`: Process player actions via WebSocket
- `get_game_state_response()`: Return game state for specific player position
- `get_max_players()`: Define player limits
- `get_game_ai()`: AI opponent implementations

Current games: TicTacToe, Ultimate (Tic-Tac-Toe), Topological Connect Four, Wizard (card game)

### Frontend Game System
Each game has its own directory under `/components/` containing:
- `*Context.tsx`: React context for game state management
- `*Game.tsx`: Main game component
- `*Board.tsx`: Game board rendering
- `*PlayerBoard.tsx`: Player-specific UI

### Managers
- `GameManager`: Handles individual game instances and WebSocket connections
- `SessionManager`: Manages player sessions and authentication
- `AIManager`: Coordinates AI opponents
- `BookManager`: Manages game lobbies and matchmaking

### WebSocket Communication
- Frontend connects via `getGameWebsocket()` in `lib/websocketFunctions.ts`
- Backend WebSocket endpoint: `/game/{game_id}/ws`
- API calls handled through `lib/apiCalls.ts` with configurable BASE_URL

### Styling & UI
- Tailwind CSS for styling
- Dark mode support via `next-themes`, whenever making new components always add in support for dark mode.
- Custom icons and SVGs in `/public/`

## Development Notes

- The project uses devenv.nix for development environment setup
- Backend uses in-memory database (Redis migration planned per frontend README)
- Test coverage exists for all games with comprehensive unit tests
- FastAPI backend includes CORS middleware for frontend integration

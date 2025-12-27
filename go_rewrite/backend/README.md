# Games Site - Go Rewrite

Multi-player board games site with AI players.

To bring the server up:

```bash
go run ./cmd/server
```

## Goroutines Running Per Game

For a single active game session with 2 human players and 1 AI:

```
┌─────────────────────────────────────────┐
│ HTTP Server (1 goroutine)               │  ← net/http handles requests
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ GameSession Actor (1 goroutine)         │  ← Owns game state, processes actions
│  - Manages: human WebSockets + AI runners
│  - Receives: ActionMessage              │
│  - Sends: StateMessage                  │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ WebSocket Handler (2 goroutines/player) │  ← Per human player
│  Player n: ReadLoop + WriteLoop         │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ AI Runner (1 goroutine/AI)              │  ← Per AI player (managed by GameSession)
│  - Watches state updates                │
│  - Computes moves asynchronously        │
│  - Sends actions to GameSession         │
└─────────────────────────────────────────┘

Total: ~7-8 goroutines per active game
```

## Data Flow: Incoming Actions

```
Frontend (JSON)
    │
    ↓ WebSocket
┌─────────────────────────────┐
│ WebSocket ReadLoop          │  Parse JSON → protocol.Request
│ (goroutine per player)      │
└──────────┬──────────────────┘
           ↓ domain.ActionMessage {PlayerID, Request}
┌─────────────────────────────┐
│ GameSession.actionChan      │  Sequential processing (single goroutine)
│ (buffered channel)          │
└──────────┬──────────────────┘
           ↓
┌─────────────────────────────┐
│ Game.HandleAction()         │  Game logic validates & mutates state
│ (TicTacToe, Wizard, etc.)   │
└──────────┬──────────────────┘
           ↓
┌─────────────────────────────┐
│ EventStore (optional)       │  Persist action for replay
└─────────────────────────────┘
```

## Data Flow: Outgoing State

```
┌─────────────────────────────┐
│ Game.GetStateForAll()       │  After action, generate state updates
│                             │  Returns []StateMessage
└──────────┬──────────────────┘
           ↓ domain.StateMessage {PlayerID, Response}
┌─────────────────────────────┐
│ Broadcast Manager           │  Routes messages by PlayerID
│ (1 goroutine)               │  PlayerID="" → all players
└──────────┬──────────────────┘
           │
           ├─────────────────────────┐
           ↓                         ↓
┌────────────────────┐   ┌────────────────────┐
│ WebSocket          │   │ AI Runner          │
│ WriteLoop          │   │ stateUpdateChan    │
│ (per human player) │   │ (per AI player)    │
└─────────┬──────────┘   └──────────┬─────────┘
          ↓                         ↓
    Frontend (JSON)         AI.ComputeMove() → ActionMessage
```

## Architecture Layers

### 1. Protocol Layer (`protocol/`)
**Purpose:** Wire format - JSON messages sent/received over WebSocket

**Contains:**
- `protocol.Request` - Generic action from frontend
- `protocol.Response` - Generic response to frontend
- Game-specific types: `TicTacToeGameStateResponse`, `WizardStateResponse`, etc.

**Key:** This is your API contract with the frontend. Stable, versioned.

### 2. Domain Layer (`internal/domain/`)

**Purpose:** Game logic and business rules

**Core Interface:**
- `Game` - Each game (TicTacToe, Ultimate, Wizard) implements this
  - `HandleAction(ActionMessage) *ErrorResponse` - Process player action
  - `GetStateForPlayer(playerID) Response` - Get state for specific player
  - `AddPlayer(playerID) error` - Join game (game assigns position internally)
  - `RemovePlayer(playerID)` - Leave game
  - `CreateAI(aiType string) AI` - Factory for game-specific AI

**Key Types:**
- `ActionMessage` - Wraps `protocol.Request` + player context
- `StateMessage` - Wraps `protocol.Response` + routing info (which player)

**Player Management:**
- Each game maintains `playerID → position` mapping internally
- "Position" is game-specific (e.g., TicTacToe: 0=X, 1=O; Wizard: turn order)
- GameSession doesn't care about positions, just routes messages

### 3. Application Layer (`internal/app/`)

**Purpose:** Orchestration - manages game sessions and routing

**GameSession (Actor):**
- Runs in own goroutine
- Owns game state exclusively (single-owner, no locks)
- Manages ALL players (human WebSockets + AI goroutines)
- Processes actions sequentially via `actionChan`
- Sends state updates via `outgoingChan`
- **Handles AI lifecycle**: AddAI(), RemoveAI() - creates/stops AI goroutines

**Registry:**
- Maps `gameID → *GameSession`
- Thread-safe (uses `sync.RWMutex`)
- Creates/destroys game sessions

### 4. Infrastructure Layer (`internal/infra/`)
**Purpose:** I/O - WebSockets, HTTP, persistence

**WebSocket Handler:**
- One per client connection
- ReadLoop: JSON → `protocol.Request` → `ActionMessage` → `session.actionChan`
- WriteLoop: `StateMessage` → `protocol.Response` → JSON

**HTTP API:**
- `POST /game/new/tictactoe` - Create game, return `game_id`
- `GET /game/{id}/metadata` - Game info
- `WS /game/{id}/ws` - WebSocket connection

**Event Store (future):**
- Persist `ActionMessage` for each action
- Replay to reconstruct state

## Project Structure

```
go_rewrite/
├── cmd/server/main.go           # Entry point - wires everything together
│
├── protocol/                    # API CONTRACT - Frontend/Backend shared types
│   ├── common.go                # Request, Response, ErrorResponse, etc.
│   ├── *game*.go                # game-specific messages
│  ...
│
└── internal/
    ├── domain/                  # GAME LOGIC - Business rules
    │   ├── game.go              # Game interface (all games implement this)
    │   ├── session.go           # ActionMessage, StateMessage types
    │   ├── player.go            # Player types (Human, AI)
    │   └── games/
    │       ├── *game*/          # game implementation
    │       │   ├── game.go      # Game logic
    │       │   └── ai.go        # AI algorithms (minimax, etc.)
    │      ...
    │
    ├── app/                     # ORCHESTRATION - Session management
    │   ├── game_session.go      # GameSession actor (goroutine per game)
    │   ├── registry.go          # Maps gameID → GameSession
    │   └── broadcast.go         # Routes StateMessages to clients
    │
    └── infra/                   # I/O - WebSockets, HTTP, persistence
        ├── http/
        │   └── server.go        # HTTP routes, handlers
        ├── websocket/
        │   └── handler.go       # WebSocket connection handling
        └── eventstore/          # (future) Event persistence
            └── memory.go
```

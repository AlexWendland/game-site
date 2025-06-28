# Backend Manager Architecture

This document explains the current architecture of the backend manager system and identifies areas for improvement.

## Current Architecture Overview

The backend uses a hierarchical manager system with four main components:

```
BookManager (Top-level orchestrator)
    ├── GameManager (Core game coordinator)
    │   ├── SessionManager (Player positioning)
    │   └── AIManager (AI orchestration)
    └── DBManager (Persistence abstraction)
```

## Manager Responsibilities

### BookManager
- **Role**: Top-level game lifecycle management
- **Responsibilities**:
  - Creates and removes games
  - Handles game persistence via DBManager
  - Manages active game cache
  - Provides game metadata and AI model information
- **Dependencies**: DBManager, GameManager
- **Location**: `book_manager.py`

### GameManager
- **Role**: Central hub for individual game instances
- **Responsibilities**:
  - WebSocket connection handling for human players
  - Message routing between players, sessions, and AI
  - Broadcasting game state updates
  - Player lifecycle management (both human and AI)
  - Game logic coordination
- **Dependencies**: SessionManager, AIManager, GameBase
- **Location**: `game_manager.py`

### SessionManager
- **Role**: Player name and position management
- **Responsibilities**:
  - Player name assignment and conflict resolution
  - Board position tracking
  - Session state broadcasting
- **Dependencies**: None (leaf component)
- **Location**: `session_manager.py`

### AIManager
- **Role**: AI player orchestration
- **Responsibilities**:
  - AI instance creation and removal
  - AI model management
  - AI action execution coordination
- **Dependencies**: GameAI instances
- **Location**: `ai_manager.py`

### DBManager
- **Role**: Persistence abstraction layer
- **Current Implementation**: InMemoryDBManager (Redis migration planned)
- **Dependencies**: None
- **Location**: `db_manager.py`

## Data Flow

1. **Game Creation**: BookManager creates GameManager instance
2. **Player Connection**: 
   - Human: WebSocket connects to GameManager
   - AI: AIManager creates AI instance, GameManager handles integration
3. **Message Processing**: GameManager routes messages between components
4. **State Updates**: GameManager broadcasts updates to all connected players
5. **Persistence**: BookManager handles game state persistence via DBManager

## Player Model

Both AI and human players are unified under a common interface:

```python
Player = WebSocket | GameAI  # Type union
```

Players are stored in the same data structures but handled differently:
- **Human Players**: WebSocket JSON messages
- **AI Players**: Direct method calls with action bus for responses

## Current Architectural Issues

### 1. Tight Coupling: AIManager ↔ GameManager

**Problem**: AIManager requires three callback functions from GameManager:

```python
ai_manager = AIManager(
    game_models=game.get_game_ai(),
    add_ai=manager._connect_ai,      # GameManager callback
    act_as_ai=manager._action_message, # GameManager callback
    remove_ai=manager._disconnect     # GameManager callback
)
```

**Issues**:
- Circular dependency through callback injection
- AIManager cannot function without GameManager
- Difficult to test AIManager in isolation
- Violates single responsibility principle

### 2. Mixed Responsibilities in GameManager

GameManager handles too many concerns:
- WebSocket connection management
- Message routing
- State broadcasting
- Player lifecycle
- AI integration
- Action processing

### 3. Different Treatment of AI vs Human Players

While unified in data structures, AI and human players have different:
- Connection flows (WebSocket handshake vs direct instantiation)
- Message handling (JSON vs method calls)
- Initialization processes (simple vs multi-step)
- Error handling patterns

### 4. Session vs Connection State Split

- **SessionManager**: Stores player names and positions
- **GameManager**: Stores which clients are connected
- Creates confusion about source of truth for player state

### 5. Complex AI Initialization

AI players require a multi-step initialization process:
1. Create AI instance
2. Connect to GameManager
3. Set player name via session
4. Set player position via session
5. Request initial game state
6. Validate setup

This process is fragile and hard to debug.

## Architecture Strengths

1. **Clear Separation of Concerns**: Each manager has distinct responsibilities
2. **Unified Player Interface**: AI and humans treated similarly in core logic
3. **Extensible AI System**: Easy to add new AI types via GameAI base class
4. **Message-Based Communication**: Clean WebSocket request/response pattern
5. **Persistence Abstraction**: DBManager allows different storage backends
6. **Comprehensive Testing**: Good test coverage for individual managers

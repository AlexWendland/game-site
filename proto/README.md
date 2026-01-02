# Protocol Buffers WebSocket

Instead of manually writing types in both Go and TypeScript, we:

1. Define the interface once in `.proto` files
2. Generate type-safe code for both languages
3. Get compile-time errors if either side doesn't match the contract

## Structure

```
proto/
├── common.proto # Shared messages
├── *game*.proto # game-specific messages and service definition
├── buf.yaml     # Buf configuration
└── buf.gen.yaml # Code generation configuration
```

## Generated Code

Generated files are placed in:
- **Go**: `backend/proto/gen/`
- **TypeScript**: `frontend/proto/gen/`

**Don't edit these files directly** - they're regenerated when you run `buf generate`.
To generate the code, run the steps below.

```bash
cd proto
buf generate
```

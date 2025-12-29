# Games Site

This is a multi-player board games site that will run on the web.
It will have AI players and human players.
The frontend is written in React, and the backend written in Go.
Both will be hosted from the same server (Go).
(I am doing this to learn Go!)

## Running in dev mode

For development, we use NextJS to host the front end separately from the backed.
```bash
cd frontend
npm run dev
```
This will host the front end on port 3000.
For the backend, we use go to host the server.
```bash
cd backend
go run ./cmd/server
```

## Migration plan

We are migrating from the old frontend/backend into the folder one game at a time.
Though we are adding some new features as we migrate:

- Site wide authentication.
- Event driven architectures using go routines.
- Proper state maintenance and recovery.
- Single server deployment.

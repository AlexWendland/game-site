# Multi-stage Dockerfile for Games Site
# Stage 1: Build NextJS frontend static export
# Stage 2: Build Go backend
# Stage 3: Combine into final production image

# === Frontend Build Stage ===
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy package files and install dependencies
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci

# Copy frontend source and build static export
COPY frontend/ ./
RUN npm run build

# === Backend Build Stage ===
FROM golang:1.25.4-alpine AS backend-builder

WORKDIR /app

# Copy go mod files and download dependencies
COPY backend/go.mod backend/go.sum ./
RUN go mod download

# Copy backend source
COPY backend/ ./

# Build the Go binary
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/server ./cmd/server

# === Final Production Stage ===
FROM alpine:latest

WORKDIR /app

# Install ca-certificates for HTTPS requests
RUN apk --no-cache add ca-certificates

# Copy the Go binary from backend-builder
COPY --from=backend-builder /app/server /app/server

# Copy the static frontend files from frontend-builder
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Expose the port the app runs on
EXPOSE 8080

# Run the server in production mode
ENTRYPOINT ["/app/server", "-prod"]

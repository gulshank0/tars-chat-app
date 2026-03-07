# ── Stage 1: Build ──────────────────────────────────────────────
FROM golang:1-alpine AS builder

# Let Go auto-download the exact toolchain version from go.mod
ENV GOTOOLCHAIN=auto

# Install git (needed for some Go modules) and ca-certs
RUN apk add --no-cache git ca-certificates

WORKDIR /app

# Cache dependencies first (only re-downloads when go.mod/go.sum change)
COPY go.mod go.sum ./
RUN go mod download && go mod verify

# Copy source code
COPY . .

# Build a fully static binary with optimizations
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build -ldflags="-s -w" -trimpath -o /server ./cmd/server/main.go

# ── Stage 2: Production ────────────────────────────────────────
FROM alpine:3.20

# Install runtime deps + create non-root user + uploads dir (single layer)
RUN apk add --no-cache ca-certificates tzdata curl \
    && addgroup -S appgroup && adduser -S appuser -G appgroup \
    && mkdir -p /app/uploads && chown -R appuser:appgroup /app

WORKDIR /app

# Copy binary and migrations from builder
COPY --from=builder /server .
COPY --from=builder /app/migrations ./migrations

# Fix ownership after COPY
RUN chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Render injects PORT env var — expose default
EXPOSE 8080

# Health check so Render knows the service is alive
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8080}/api/health || exit 1

# Run the server
CMD ["./server"]
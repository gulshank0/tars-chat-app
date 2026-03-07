# backend/Dockerfile
FROM golang:1.22-alpine AS builder
WORKDIR /app
# Copy go.mod and go.sum first for better caching
COPY go.mod go.sum ./
RUN go mod download
# Copy the rest of the source
COPY . .
# Build the binary
RUN CGO_ENABLED=0 GOOS=linux go build -o /server ./cmd/server/main.go
# --- Production stage ---
FROM alpine:3.20
RUN apk add --no-cache ca-certificates tzdata
WORKDIR /app
# Copy binary and migrations
COPY --from=builder /server .
COPY --from=builder /app/migrations ./migrations
# Create uploads directory (for local fallback)
RUN mkdir -p /app/uploads
EXPOSE 8080
CMD ["./server"]
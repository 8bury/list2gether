# Build stage
FROM golang:1.24-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o list2gether .

# Final stage
FROM alpine:3.20

# CA certificates for HTTPS calls to TMDB API
RUN apk --no-cache add ca-certificates tzdata

WORKDIR /app

COPY --from=builder /app/list2gether .

EXPOSE 8080

CMD ["./list2gether"]

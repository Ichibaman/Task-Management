# Stage 1: Build
FROM golang:1.24git -alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
# Copy the rest of the source code
COPY . .
RUN go build -o main .

# Stage 2: Run
FROM alpine:latest
WORKDIR /root/
# Copy the binary and the .env file
COPY --from=builder /app/main .

EXPOSE 8080
CMD ["./main"]
FROM golang:1.24
WORKDIR /app
COPY . .
RUN go mod tidy
RUN go build -o auth-service
CMD ["/app/auth-service"]

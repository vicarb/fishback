FROM golang:1.24
WORKDIR /app
COPY . .
RUN go mod tidy
RUN go build -o order-service
CMD ["/app/order-service"]

# Usa la imagen base de Go
FROM golang:1.24

# Establecer el directorio de trabajo dentro del contenedor
WORKDIR /app

# Copiar los archivos del proyecto
COPY . .

# Descargar dependencias
RUN go mod tidy

# Compilar la aplicación
RUN go build -o inventory-service

# Ejecutar el servicio
CMD ["/app/inventory-service"]

package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-redis/redis/v8"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// Database and Redis connections
var (
	ctx context.Context = context.Background()
	rdb *redis.Client
	db  *gorm.DB
)

// Order model
type Order struct {
	ID        uint `gorm:"primaryKey"`
	ProductID uint `gorm:"index"`
	Quantity  int
	Status    string `gorm:"index"` // "PENDING", "CONFIRMED", "CANCELLED"
}

// Connect to PostgreSQL with retries
func connectDB() {
	dsn := "host=postgres user=postgres dbname=ecommerce password=password sslmode=disable"

	var err error
	for retries := 5; retries > 0; retries-- {
		db, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
		if err == nil {
			break
		}
		log.Println("⏳ Waiting for database connection...")
		time.Sleep(5 * time.Second)
	}

	if err != nil {
		log.Fatal("❌ Failed to connect to database:", err)
	}

	if err := db.AutoMigrate(&Order{}); err != nil {
		log.Fatal("❌ Failed to migrate Order table:", err)
	}
	log.Println("✅ Connected to PostgreSQL and Order table migrated")
}

// Connect to Redis
func connectRedis() {
	rdb = redis.NewClient(&redis.Options{Addr: "redis:6379"})
	_, err := rdb.Ping(ctx).Result()
	if err != nil {
		log.Fatal("❌ Failed to connect to Redis:", err)
	}
	log.Println("✅ Connected to Redis")
}

// Create an order (checks stock in Inventory Service)
func createOrder(w http.ResponseWriter, r *http.Request) {
	productID := uint(1) // Example
	quantity := 1

	// Prevent simultaneous purchases using Redis lock
	lockKey := fmt.Sprintf("lock:product:%d", productID)
	if ok, _ := rdb.SetNX(ctx, lockKey, "locked", 5*time.Second).Result(); !ok {
		http.Error(w, "Producto en proceso de compra por otro usuario", http.StatusConflict)
		return
	}
	defer rdb.Del(ctx, lockKey)

	// Check stock in Inventory Service
	stock, err := checkStock(productID)
	if err != nil || stock < quantity {
		http.Error(w, "Stock insuficiente", http.StatusBadRequest)
		return
	}

	// Create order in PENDING state
	order := Order{ProductID: productID, Quantity: quantity, Status: "PENDING"}
	db.Create(&order)

	// Reduce stock in Inventory Service (Reserve)
	updateStock(productID, -quantity)

	w.WriteHeader(http.StatusCreated)
	fmt.Fprintln(w, "Orden creada con éxito")
}
func cancelOrder(w http.ResponseWriter, r *http.Request) {
	var data struct {
		OrderID uint `json:"order_id"`
	}

	if err := json.NewDecoder(r.Body).Decode(&data); err != nil {
		http.Error(w, "Invalid request data", http.StatusBadRequest)
		return
	}

	var order Order
	if err := db.First(&order, "id = ?", data.OrderID).Error; err != nil {
		http.Error(w, "Orden no encontrada", http.StatusNotFound)
		return
	}

	// Check if order is already canceled
	if order.Status == "CANCELLED" {
		http.Error(w, "Orden ya cancelada", http.StatusBadRequest)
		return
	}

	// Mark order as canceled
	db.Model(&order).Update("status", "CANCELLED")

	// Restore stock in Inventory Service
	updateStock(order.ProductID, order.Quantity)

	log.Printf("Orden %d cancelada, stock restaurado", order.ID)
	fmt.Fprintln(w, "Orden cancelada y stock restaurado")
}

// Check stock in Inventory Service
func checkStock(productID uint) (int, error) {
	var stock int
	err := db.Raw("SELECT stock FROM inventories WHERE product_id = ?", productID).Scan(&stock).Error
	return stock, err
}

// Update stock in Inventory Service
func updateStock(productID uint, quantity int) {
	db.Exec("UPDATE inventories SET stock = stock + ? WHERE product_id = ?", quantity, productID)
}

func main() {
	connectDB()
	connectRedis()

	r := chi.NewRouter()
	r.Post("/orders", createOrder)
	r.Post("/orders/cancel", cancelOrder)

	log.Println("Order Service running on :8081")
	http.ListenAndServe(":8081", r)
}

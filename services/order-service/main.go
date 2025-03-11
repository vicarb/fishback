package main

import (
	"bytes"
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
// Order Model with Multiple Products
type Order struct {
	ID       uint        `gorm:"primaryKey"`
	Products []OrderItem `gorm:"foreignKey:OrderID"`
	Status   string      `gorm:"index"` // "PENDING", "CONFIRMED", "CANCELLED"
}

// OrderItem Model (Each order can have multiple items)
type OrderItem struct {
	ID        uint `gorm:"primaryKey"`
	OrderID   uint
	ProductID uint
	Quantity  int
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

	// Ensure both tables exist
	if err := db.AutoMigrate(&Order{}, &OrderItem{}); err != nil {
		log.Fatal("❌ Failed to migrate Order and OrderItem tables:", err)
	}

	log.Println("✅ Connected to PostgreSQL and migrated Order + OrderItem tables")
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
// Create an order with multiple products
func createOrder(w http.ResponseWriter, r *http.Request) {
	var request struct {
		Products []struct {
			ProductID uint `json:"product_id"`
			Quantity  int  `json:"quantity"`
		} `json:"products"`
	}

	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		http.Error(w, "Invalid request data", http.StatusBadRequest)
		return
	}

	// Redis lock: prevent simultaneous purchases
	for _, item := range request.Products {
		lockKey := fmt.Sprintf("lock:product:%d", item.ProductID)
		if ok, _ := rdb.SetNX(ctx, lockKey, "locked", 5*time.Second).Result(); !ok {
			http.Error(w, "Producto en proceso de compra por otro usuario", http.StatusConflict)
			return
		}
		defer rdb.Del(ctx, lockKey)
	}

	// Verify stock for all products
	for _, item := range request.Products {
		stock, err := checkStock(item.ProductID)
		if err != nil || stock < item.Quantity {
			http.Error(w, "Stock insuficiente para uno o más productos", http.StatusBadRequest)
			return
		}
	}

	// Create new order
	order := Order{Status: "PENDING"}
	db.Create(&order)

	// Process each product in the order
	for _, item := range request.Products {
		orderItem := OrderItem{
			OrderID:   order.ID,
			ProductID: item.ProductID,
			Quantity:  item.Quantity,
		}
		db.Create(&orderItem)

		// Reduce stock in Inventory Service
		updateStock(item.ProductID, -item.Quantity)
	}

	log.Printf("Orden %d creada con %d productos", order.ID, len(request.Products))
	w.WriteHeader(http.StatusCreated)
	fmt.Fprintln(w, "Orden creada con éxito")
}

// Cancel an order and restore stock for all products
// Cancel an order and restore stock for all products
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

	if order.Status == "CANCELLED" {
		log.Printf("⚠️ Order %d is already cancelled.", order.ID)
		http.Error(w, "Orden ya cancelada", http.StatusBadRequest)
		return
	}

	// Retrieve all items in the order
	var orderItems []OrderItem
	db.Where("order_id = ?", order.ID).Find(&orderItems)

	if len(orderItems) == 0 {
		log.Printf("❌ No items found for Order %d", order.ID)
		http.Error(w, "No items found in order", http.StatusInternalServerError)
		return
	}

	// Prepare stock update request for Inventory Service
	var stockUpdates []struct {
		ProductID uint `json:"product_id"`
		Change    int  `json:"change"`
	}

	for _, item := range orderItems {
		stockUpdates = append(stockUpdates, struct {
			ProductID uint `json:"product_id"`
			Change    int  `json:"change"`
		}{ProductID: item.ProductID, Change: item.Quantity})
	}

	log.Printf("📡 Sending stock update request to Inventory Service: %+v", stockUpdates)

	// Restore stock in Inventory Service
	err := updateStockInInventory(stockUpdates)
	if err != nil {
		log.Println("❌ Error restoring stock in Inventory Service:", err)
		http.Error(w, "Error al restaurar stock", http.StatusInternalServerError)
		return
	}

	// Mark order as cancelled
	db.Model(&order).Update("status", "CANCELLED")

	log.Printf("✅ Order %d cancelled, stock restored", order.ID)
	fmt.Fprintln(w, "Orden cancelada y stock restaurado")
}

// Function to update stock in Inventory Service
func updateStockInInventory(stockUpdates []struct {
	ProductID uint `json:"product_id"`
	Change    int  `json:"change"`
}) error {
	requestBody, _ := json.Marshal(map[string]interface{}{
		"items": stockUpdates,
	})

	log.Printf("📡 Sending request to Inventory Service: %s", string(requestBody))

	resp, err := http.Post("http://inventory-service:8082/inventory/update", "application/json", bytes.NewBuffer(requestBody))
	if err != nil {
		log.Println("❌ Error contacting Inventory Service:", err)
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		log.Printf("❌ Inventory Service returned status: %d", resp.StatusCode)
		return fmt.Errorf("inventory service returned %d", resp.StatusCode)
	}

	log.Println("✅ Stock successfully restored in Inventory Service")
	return nil
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

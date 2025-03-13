package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/go-redis/redis/v8"
	"github.com/golang-jwt/jwt/v5"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// Database and Redis connections
var (
	db  *gorm.DB
	rdb *redis.Client
)

// JWT Secret Key
var jwtSecret = []byte("your_secret_key")

// Order Model
type Order struct {
	ID       uint        `gorm:"primaryKey"`
	Email    string      `json:"email"` // Customer or guest email
	Products []OrderItem `gorm:"foreignKey:OrderID"`
	Status   string      `gorm:"index"` // PENDING, CONFIRMED, CANCELLED, SHIPPED, DELIVERED
}

// OrderItem Model
type OrderItem struct {
	ID        uint `gorm:"primaryKey"`
	OrderID   uint
	ProductID uint
	Quantity  int
}

// JWT Claims
type Claims struct {
	Email string `json:"email"`
	Role  string `json:"role"`
	jwt.RegisteredClaims
}

// Connect to PostgreSQL
func connectDB() {
	dsn := "host=postgres user=postgres dbname=ecommerce password=password sslmode=disable"
	var err error
	db, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("❌ Failed to connect to database:", err)
	}
	if err := db.AutoMigrate(&Order{}, &OrderItem{}); err != nil {
		log.Fatal("❌ Failed to migrate Order and OrderItem tables:", err)
	}
	log.Println("✅ Connected to PostgreSQL and migrated Order + OrderItem tables")
}

// Connect to Redis
func connectRedis() {
	rdb = redis.NewClient(&redis.Options{Addr: "redis:6379"})
	_, err := rdb.Ping(rdb.Context()).Result()
	if err != nil {
		log.Fatal("❌ Failed to connect to Redis:", err)
	}
	log.Println("✅ Connected to Redis")
}

// Middleware: Authenticate User
func authMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tokenStr := r.Header.Get("Authorization")
		if tokenStr == "" {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		tokenStr = strings.TrimPrefix(tokenStr, "Bearer ")
		token, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(token *jwt.Token) (interface{}, error) {
			return jwtSecret, nil
		})

		if err != nil || !token.Valid {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		claims, _ := token.Claims.(*Claims)
		r.Header.Set("User-Email", claims.Email)
		r.Header.Set("User-Role", claims.Role)

		next(w, r)
	}
}

// Middleware: Admin Access Only
func adminMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		role := r.Header.Get("User-Role")
		if role != "admin" {
			http.Error(w, "Forbidden", http.StatusForbidden)
			return
		}
		next(w, r)
	}
}

// Create an Order (Guest & Customers)
func createOrder(w http.ResponseWriter, r *http.Request) {
	var request struct {
		Email    string `json:"email,omitempty"`
		Products []struct {
			ProductID uint `json:"product_id"`
			Quantity  int  `json:"quantity"`
		} `json:"products"`
	}

	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		http.Error(w, "Invalid request data", http.StatusBadRequest)
		return
	}

	tokenStr := r.Header.Get("Authorization")
	tokenStr = strings.TrimPrefix(tokenStr, "Bearer ")

	var email string
	if tokenStr != "" {
		token, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(token *jwt.Token) (interface{}, error) {
			return jwtSecret, nil
		})
		if err == nil {
			if claims, ok := token.Claims.(*Claims); ok && token.Valid {
				email = claims.Email
			}
		}
	}

	if email == "" {
		if request.Email == "" {
			http.Error(w, "Guest users must provide an email", http.StatusBadRequest)
			return
		}
		email = request.Email
	}

	order := Order{Email: email, Status: "PENDING"}
	db.Create(&order)

	for _, item := range request.Products {
		orderItem := OrderItem{OrderID: order.ID, ProductID: item.ProductID, Quantity: item.Quantity}
		db.Create(&orderItem)
		updateStock(item.ProductID, -item.Quantity)
	}

	log.Printf("✅ Order %d created for %s", order.ID, email)
	w.WriteHeader(http.StatusCreated)
	fmt.Fprintln(w, "Order created successfully")
}

// Update stock in Inventory Service
func updateStock(productID uint, quantity int) {
	db.Exec("UPDATE inventories SET stock = stock + ? WHERE product_id = ?", quantity, productID)
}

// Admin: View All Orders
func getAllOrders(w http.ResponseWriter, r *http.Request) {
	var orders []Order
	db.Preload("Products").Find(&orders)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(orders)
}

// Admin: Confirm an Order
func confirmOrder(w http.ResponseWriter, r *http.Request) {
	var data struct {
		OrderID uint `json:"order_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&data); err != nil {
		http.Error(w, "Invalid request data", http.StatusBadRequest)
		return
	}

	var order Order
	if err := db.First(&order, "id = ?", data.OrderID).Error; err != nil {
		http.Error(w, "Order not found", http.StatusNotFound)
		return
	}

	db.Model(&order).Update("status", "CONFIRMED")
	log.Printf("✅ Order %d confirmed", order.ID)
	fmt.Fprintln(w, "Order confirmed successfully")
}

// Admin: Cancel an Order (Restores Stock)
func cancelOrderAdmin(w http.ResponseWriter, r *http.Request) {
	var data struct {
		OrderID uint `json:"order_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&data); err != nil {
		http.Error(w, "Invalid request data", http.StatusBadRequest)
		return
	}

	var order Order
	if err := db.First(&order, "id = ?", data.OrderID).Error; err != nil {
		http.Error(w, "Order not found", http.StatusNotFound)
		return
	}

	var orderItems []OrderItem
	db.Where("order_id = ?", order.ID).Find(&orderItems)

	for _, item := range orderItems {
		updateStock(item.ProductID, item.Quantity)
	}

	db.Model(&order).Update("status", "CANCELLED")
	log.Printf("✅ Order %d cancelled", order.ID)
	fmt.Fprintln(w, "Order cancelled successfully")
}

func main() {
	connectDB()
	connectRedis()

	r := chi.NewRouter()
	r.Post("/orders", createOrder)
	r.Get("/orders", authMiddleware(adminMiddleware(getAllOrders)))
	r.Patch("/orders/confirm", authMiddleware(adminMiddleware(confirmOrder)))
	r.Patch("/orders/cancel", authMiddleware(adminMiddleware(cancelOrderAdmin)))

	log.Println("📦 Order Service running on :8081")
	http.ListenAndServe(":8081", r)
}

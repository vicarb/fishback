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
	Status   string      `gorm:"index"`
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
func authMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
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

		next.ServeHTTP(w, r)
	})
}

// Middleware: Admin Access Only
func adminMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		role := r.Header.Get("User-Role")
		if role != "admin" {
			http.Error(w, "Forbidden", http.StatusForbidden)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// Create an Order (Guest & Customers)
func createOrder(w http.ResponseWriter, r *http.Request) {
	var request struct {
		Email    string `json:"email,omitempty"` // Guests provide this, customers do not
		Products []struct {
			ProductID uint `json:"product_id"`
			Quantity  int  `json:"quantity"`
		} `json:"products"`
	}

	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		http.Error(w, "Invalid request data", http.StatusBadRequest)
		return
	}

	// Extract user info from JWT (if authenticated)
	tokenStr := r.Header.Get("Authorization")
	tokenStr = strings.TrimPrefix(tokenStr, "Bearer ")

	var email string
	if tokenStr != "" {
		token, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(token *jwt.Token) (interface{}, error) {
			return jwtSecret, nil
		})
		if err == nil {
			if claims, ok := token.Claims.(*Claims); ok && token.Valid {
				email = claims.Email // Use authenticated email
			}
		}
	}

	// If the user is a guest, they MUST provide an email
	if email == "" {
		if request.Email == "" {
			http.Error(w, "Guest users must provide an email", http.StatusBadRequest)
			return
		}
		email = request.Email
	}

	// Continue with order processing
	order := Order{Email: email, Status: "PENDING"}
	db.Create(&order)

	for _, item := range request.Products {
		orderItem := OrderItem{
			OrderID:   order.ID,
			ProductID: item.ProductID,
			Quantity:  item.Quantity,
		}
		db.Create(&orderItem)
		updateStock(item.ProductID, -item.Quantity)
	}

	log.Printf("✅ Order %d created for %s", order.ID, email)
	w.WriteHeader(http.StatusCreated)
	fmt.Fprintln(w, "Order created successfully")
}

// Get Orders (Customers see their own, Admin sees all)
func getOrders(w http.ResponseWriter, r *http.Request) {
	userEmail := r.Header.Get("User-Email")
	userRole := r.Header.Get("User-Role")

	var orders []Order
	if userRole == "admin" {
		db.Preload("Products").Find(&orders) // Admin sees all
	} else {
		db.Preload("Products").Where("email = ?", userEmail).Find(&orders) // Customer sees their own
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(orders)
}

// Cancel an Order (Customers cancel their own, Admin cancels any)
func cancelOrder(w http.ResponseWriter, r *http.Request) {
	var request struct {
		OrderID uint `json:"order_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		http.Error(w, "Invalid request data", http.StatusBadRequest)
		return
	}

	var order Order
	if err := db.First(&order, request.OrderID).Error; err != nil {
		http.Error(w, "Order not found", http.StatusNotFound)
		return
	}

	// Only allow cancellation by the order owner or admin
	userEmail := r.Header.Get("User-Email")
	userRole := r.Header.Get("User-Role")

	if userRole != "admin" && order.Email != userEmail {
		http.Error(w, "You can only cancel your own orders", http.StatusForbidden)
		return
	}

	// Restore stock
	var orderItems []OrderItem
	db.Where("order_id = ?", order.ID).Find(&orderItems)

	for _, item := range orderItems {
		updateStock(item.ProductID, item.Quantity)
	}

	// Mark order as cancelled
	db.Model(&order).Update("status", "CANCELLED")

	log.Printf("✅ Order %d cancelled by %s", order.ID, userEmail)
	fmt.Fprintln(w, "Order cancelled successfully")
}

// Check stock from Inventory Service
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

	// Order creation is open to guests and authenticated users
	r.Post("/orders", createOrder)

	// Authenticated users required for order listing and cancellation
	r.Get("/orders", authMiddleware(http.HandlerFunc(getOrders)).ServeHTTP)
	r.Post("/orders/cancel", authMiddleware(http.HandlerFunc(cancelOrder)).ServeHTTP)

	log.Println("📦 Order Service running on :8081")
	http.ListenAndServe(":8081", r)
}

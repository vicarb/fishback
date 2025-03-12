package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// Database connection
var db *gorm.DB
var ctx = context.Background()

// Inventory model
type Inventory struct {
	ProductID uint `gorm:"primaryKey"`
	Stock     int
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

	if err := db.AutoMigrate(&Inventory{}); err != nil {
		log.Fatal("❌ Failed to migrate Inventory table:", err)
	}
	log.Println("✅ Connected to PostgreSQL and Inventory table migrated")
}

// Get stock for a given product ID
func getStock(w http.ResponseWriter, r *http.Request) {
	productIDStr := r.URL.Query().Get("product_id")
	if productIDStr == "" {
		http.Error(w, "Missing product_id parameter", http.StatusBadRequest)
		return
	}

	productID, err := strconv.Atoi(productIDStr)
	if err != nil {
		http.Error(w, "Invalid product_id", http.StatusBadRequest)
		return
	}

	var inventory Inventory
	if err := db.First(&inventory, "product_id = ?", productID).Error; err != nil {
		http.Error(w, "Producto no encontrado", http.StatusNotFound)
		return
	}

	log.Printf("📊 Stock for product %d: %d", productID, inventory.Stock)
	fmt.Fprintf(w, "Stock disponible: %d", inventory.Stock)
}

// Register initial stock for a new product
// Register initial stock for a new product
func createStock(w http.ResponseWriter, r *http.Request) {
	var request struct {
		ProductID uint `json:"product_id"`
		Stock     int  `json:"stock"`
	}

	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		log.Println("❌ Error decoding stock request:", err)
		http.Error(w, "Invalid stock request", http.StatusBadRequest)
		return
	}

	if request.ProductID == 0 {
		log.Println("❌ Error: Received Product ID 0 in stock registration")
		http.Error(w, "Invalid product ID", http.StatusBadRequest)
		return
	}

	log.Printf("📦 Registering stock for Product ID: %d with quantity: %d", request.ProductID, request.Stock)

	// Check if stock entry already exists
	var existing Inventory
	if err := db.First(&existing, "product_id = ?", request.ProductID).Error; err == nil {
		http.Error(w, "Stock entry already exists for this product", http.StatusConflict)
		return
	}

	// Save stock in the database
	inventory := Inventory{ProductID: request.ProductID, Stock: request.Stock}
	if err := db.Create(&inventory).Error; err != nil {
		log.Println("❌ Error saving stock:", err)
		http.Error(w, "Error al registrar stock", http.StatusInternalServerError)
		return
	}

	log.Printf("✅ Stock successfully registered for Product ID: %d", request.ProductID)
	w.WriteHeader(http.StatusCreated)
	fmt.Fprintln(w, "Stock inicial registrado")
}

// **🔄 Update stock when orders are placed or canceled**
func updateStock(w http.ResponseWriter, r *http.Request) {
	var request struct {
		Items []struct {
			ProductID uint `json:"product_id"`
			Change    int  `json:"change"`
		} `json:"items"`
	}

	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		log.Println("❌ Invalid request data:", err)
		http.Error(w, "Invalid request data", http.StatusBadRequest)
		return
	}

	log.Println("📡 Received stock update request:", request)

	// Process each stock change
	for _, item := range request.Items {
		var inventory Inventory
		if err := db.First(&inventory, "product_id = ?", item.ProductID).Error; err != nil {
			log.Printf("❌ Product %d not found in inventory", item.ProductID)
			http.Error(w, "Stock insuficiente o producto no encontrado", http.StatusBadRequest)
			return
		}

		// Prevent negative stock
		newStock := inventory.Stock + item.Change
		if newStock < 0 {
			log.Printf("❌ Stock insuficiente for product %d", item.ProductID)
			http.Error(w, "Stock insuficiente", http.StatusBadRequest)
			return
		}

		// Update stock
		db.Model(&inventory).Update("stock", newStock)
		log.Printf("✅ Stock updated for product %d. New stock: %d", item.ProductID, newStock)
	}

	fmt.Fprintln(w, "Stock actualizado con éxito")
}

// **🔧 Adjust stock manually (restocking, theft, loss)**
func adjustStock(w http.ResponseWriter, r *http.Request) {
	var request struct {
		ProductID uint   `json:"product_id"`
		Change    int    `json:"change"`
		Reason    string `json:"reason"`
	}

	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		http.Error(w, "Invalid request data", http.StatusBadRequest)
		return
	}

	// Find the product stock
	var inventory Inventory
	if err := db.First(&inventory, "product_id = ?", request.ProductID).Error; err != nil {
		log.Printf("❌ Product %d not found in inventory", request.ProductID)
		http.Error(w, "Product not found in inventory", http.StatusNotFound)
		return
	}

	// Ensure stock does not go negative
	newStock := inventory.Stock + request.Change
	if newStock < 0 {
		log.Printf("❌ Cannot decrease stock of Product %d below zero", request.ProductID)
		http.Error(w, "Stock insuficiente", http.StatusBadRequest)
		return
	}

	// Update stock in the database
	db.Model(&inventory).Update("stock", newStock)
	log.Printf("✅ Stock adjusted for Product %d. Change: %+d. New stock: %d. Reason: %s",
		request.ProductID, request.Change, newStock, request.Reason)

	fmt.Fprintln(w, "Stock updated successfully")
}

func main() {
	connectDB()

	r := chi.NewRouter()
	r.Get("/inventory", getStock)            // ✅ Check stock
	r.Post("/inventory/create", createStock) // ✅ Create stock
	r.Post("/inventory/update", updateStock) // ✅ Update stock when orders are placed/canceled
	r.Post("/inventory/adjust", adjustStock) // ✅ Adjust stock manually (loss, replenishment)

	log.Println("📦 Inventory Service running on :8082")
	http.ListenAndServe(":8082", r)
}

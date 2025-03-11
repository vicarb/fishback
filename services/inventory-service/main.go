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

// Get stock for a given product ID (Dynamic query)
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

	log.Printf("Stock for product %d: %d", productID, inventory.Stock)
	fmt.Fprintf(w, "Stock disponible: %d", inventory.Stock)
}

// Register initial stock for a new product
func createStock(w http.ResponseWriter, r *http.Request) {
	var inventory Inventory
	if err := json.NewDecoder(r.Body).Decode(&inventory); err != nil {
		http.Error(w, "Error en datos", http.StatusBadRequest)
		return
	}

	log.Printf("Registering stock for Product ID: %d with stock: %d", inventory.ProductID, inventory.Stock)

	// Save stock in the database
	if err := db.Create(&inventory).Error; err != nil {
		log.Println("Error saving stock:", err)
		http.Error(w, "Error al registrar stock", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	fmt.Fprintln(w, "Stock inicial registrado")
}

// Update stock (reserve or restore)
// Update stock (reserve or restore multiple products)
func updateStock(w http.ResponseWriter, r *http.Request) {
	var request struct {
		Items []struct {
			ProductID uint `json:"product_id"`
			Change    int  `json:"change"`
		} `json:"items"`
	}

	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
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

		// Check for negative stock
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

func main() {
	connectDB()

	r := chi.NewRouter()
	r.Get("/inventory", getStock)
	r.Post("/inventory/update", updateStock)
	r.Post("/inventory/create", createStock)

	log.Println("Inventory Service running on :8082")
	http.ListenAndServe(":8082", r)
}

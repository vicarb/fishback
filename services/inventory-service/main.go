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
func updateStock(w http.ResponseWriter, r *http.Request) {
	var data struct {
		ProductID uint `json:"product_id"`
		Change    int  `json:"change"`
	}
	if err := json.NewDecoder(r.Body).Decode(&data); err != nil {
		http.Error(w, "Invalid request data", http.StatusBadRequest)
		return
	}

	var inventory Inventory
	if err := db.First(&inventory, "product_id = ?", data.ProductID).Error; err != nil || inventory.Stock+data.Change < 0 {
		http.Error(w, "Stock insuficiente o producto no encontrado", http.StatusBadRequest)
		return
	}

	db.Exec("UPDATE inventories SET stock = stock + ? WHERE product_id = ?", data.Change, data.ProductID)
	log.Printf("Stock updated for product %d. Change: %d. New stock: %d", data.ProductID, data.Change, inventory.Stock+data.Change)

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

package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// Database configuration
var db *gorm.DB

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

	if err := db.AutoMigrate(&Product{}); err != nil {
		log.Fatal("❌ Failed to migrate Product table:", err)
	}
	log.Println("✅ Connected to PostgreSQL and Product table migrated")
}

// Product Model
type Product struct {
	ID    uint    `gorm:"primaryKey"`
	Name  string  `json:"name"`
	Price float64 `json:"price"`
	Stock int     `json:"stock"`
}

// Create product and register stock in Inventory Service
func createProduct(w http.ResponseWriter, r *http.Request) {
	var product Product
	if err := json.NewDecoder(r.Body).Decode(&product); err != nil {
		http.Error(w, "Error en datos del producto", http.StatusBadRequest)
		return
	}

	// Save product to database
	db.Create(&product)
	log.Printf("Created product: %s (ID: %d, Price: %.2f, Stock: %d)", product.Name, product.ID, product.Price, product.Stock)

	// Register stock in Inventory Service
	err := registerStock(product.ID, product.Stock)
	if err != nil {
		log.Println("Error registering stock:", err)
		http.Error(w, "Error al registrar stock", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	fmt.Fprintf(w, "Producto creado con éxito")
}

// Register stock in Inventory Service
func registerStock(productID uint, stock int) error {
	reqBody := fmt.Sprintf(`{"product_id": %d, "stock": %d}`, productID, stock)
	resp, err := http.Post("http://inventory-service:8082/inventory/create", "application/json",
		bytes.NewBuffer([]byte(reqBody)))

	if err != nil {
		log.Println("Error contacting Inventory Service:", err)
		return err
	}

	if resp.StatusCode != http.StatusCreated {
		log.Println("Inventory Service returned unexpected status:", resp.StatusCode)
		return fmt.Errorf("failed to register stock")
	}

	log.Printf("Stock registered in Inventory Service for Product ID: %d", productID)
	return nil
}

// Get all products
func getProducts(w http.ResponseWriter, r *http.Request) {
	var products []Product
	db.Find(&products)

	if len(products) == 0 {
		http.Error(w, "No products found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(products)
}

func main() {
	connectDB() // ✅ Fixed connection initialization

	r := chi.NewRouter()
	r.Post("/products", createProduct)
	r.Get("/products", getProducts)

	log.Println("Product Service running on :8083")
	http.ListenAndServe(":8083", r)
}

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

// Database connection
var db *gorm.DB

// Product model (No stock field)
type Product struct {
	ID    uint    `gorm:"primaryKey"`
	Name  string  `json:"name"`
	Price float64 `json:"price"`
}

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

// Create product and register stock in Inventory Service
func createProduct(w http.ResponseWriter, r *http.Request) {
	var request struct {
		Name  string  `json:"name"`
		Price float64 `json:"price"`
		Stock int     `json:"stock"` // User still provides stock when creating the product
	}

	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		http.Error(w, "Invalid product data", http.StatusBadRequest)
		return
	}

	// Create product in Product Service
	product := Product{Name: request.Name, Price: request.Price}
	db.Create(&product)
	log.Printf("✅ Created product: %s (ID: %d, Price: %.2f)", product.Name, product.ID, product.Price)

	// Register stock in Inventory Service
	err := registerStock(product.ID, request.Stock)
	if err != nil {
		log.Println("❌ Error registering stock:", err)
		http.Error(w, "Error al registrar stock", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	fmt.Fprintf(w, "Producto creado con éxito")
}

// Register stock in Inventory Service
func registerStock(productID uint, stock int) error {
	requestBody, _ := json.Marshal(map[string]interface{}{
		"product_id": productID,
		"stock":      stock,
	})

	resp, err := http.Post("http://inventory-service:8082/inventory/create", "application/json",
		bytes.NewBuffer(requestBody))

	if err != nil {
		log.Println("❌ Error contacting Inventory Service:", err)
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated {
		log.Println("❌ Inventory Service returned unexpected status:", resp.StatusCode)
		return fmt.Errorf("inventory service returned %d", resp.StatusCode)
	}

	log.Printf("✅ Stock registered in Inventory Service for Product ID: %d", productID)
	return nil
}

// Get all products (No stock included)
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
	connectDB()

	r := chi.NewRouter()
	r.Post("/products", createProduct)
	r.Get("/products", getProducts)

	log.Println("📦 Product Service running on :8083")
	http.ListenAndServe(":8083", r)
}

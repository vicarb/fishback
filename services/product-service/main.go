package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/cors"
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
func getProduct(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var product Product
	if err := db.First(&product, id).Error; err != nil {
		http.Error(w, "Product not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(product)
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
	result := db.Create(&product)
	if result.Error != nil {
		log.Println("❌ Error creating product:", result.Error)
		http.Error(w, "Error al crear producto", http.StatusInternalServerError)
		return
	}

	// Ensure product ID is actually assigned
	if product.ID == 0 {
		log.Println("❌ Error: Product ID is 0 after creation")
		http.Error(w, "Invalid product ID", http.StatusInternalServerError)
		return
	}

	log.Printf("✅ Created product: %s (ID: %d, Price: %.2f)", product.Name, product.ID, product.Price)

	// Register stock in Inventory Service with retry
	for attempt := 1; attempt <= 3; attempt++ {
		err := registerStock(product.ID, request.Stock)
		if err == nil {
			break // Success
		}
		log.Printf("⏳ Retrying stock registration for Product ID %d (Attempt %d/3)", product.ID, attempt)
		time.Sleep(200 * time.Millisecond) // Small delay before retrying
	}

	w.WriteHeader(http.StatusCreated)
	fmt.Fprintf(w, "Producto creado con éxito")
}

// Register stock in Inventory Service
func registerStock(productID uint, stock int) error {
	if productID == 0 {
		log.Println("❌ Error: Trying to register stock with Product ID 0")
		return fmt.Errorf("invalid product ID")
	}

	// Wait a short time to ensure the Product ID is committed
	time.Sleep(100 * time.Millisecond) // Small delay for database consistency

	requestBody, _ := json.Marshal(map[string]interface{}{
		"product_id": productID,
		"stock":      stock,
	})

	log.Printf("📡 Sending stock registration request: %s", string(requestBody))

	resp, err := http.Post("http://inventory-service:8082/inventory/create", "application/json",
		bytes.NewBuffer(requestBody))

	if err != nil {
		log.Println("❌ Error contacting Inventory Service:", err)
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated {
		log.Printf("❌ Inventory Service returned unexpected status: %d", resp.StatusCode)
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

	// ✅ Enable CORS for Next.js Frontend
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"http://127.0.0.1:3000", "http://localhost:3000"}, // Add frontend URLs
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Content-Type", "Authorization"},
		AllowCredentials: true,
	}))

	r.Post("/products", createProduct)
	r.Get("/products", getProducts)
	r.Get("/products/{id}", getProduct) // ✅ Add this route

	log.Println("📦 Product Service running on :8083")
	http.ListenAndServe(":8083", r)
}

package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/golang-jwt/jwt/v5"
	"github.com/rs/cors" // Import CORS middleware package
	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var db *gorm.DB
var jwtSecret = []byte("your_secret_key")

// User model
type User struct {
	ID       uint   `gorm:"primaryKey"`
	Email    string `gorm:"unique" json:"email"`
	Password string `json:"password,omitempty"`
	Role     string `json:"role"` // "customer" or "admin"
}

// Claims structure for JWT
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
	db.AutoMigrate(&User{})

	// Ensure the admin user exists
	var admin User
	if err := db.First(&admin, "role = ?", "admin").Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			hash, _ := bcrypt.GenerateFromPassword([]byte("adminpassword"), bcrypt.DefaultCost)
			admin = User{Email: "admin@example.com", Password: string(hash), Role: "admin"}
			db.Create(&admin)
			log.Println("✅ Admin user created")
		}
	}
	log.Println("✅ Database connected and migrated")
}

// Enable CORS Middleware
func corsMiddleware() func(http.Handler) http.Handler {
	return cors.New(cors.Options{
		AllowedOrigins:   []string{"http://127.0.0.1:3000", "http://localhost:3000"}, // ✅ Allow frontend
		AllowedMethods:   []string{"GET", "POST", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Authorization", "Content-Type"},
		AllowCredentials: true, // ✅ Allows cookies & authorization headers
	}).Handler
}

// Register customer
func register(w http.ResponseWriter, r *http.Request) {
	var user User
	if err := json.NewDecoder(r.Body).Decode(&user); err != nil {
		http.Error(w, "❌ Invalid data", http.StatusBadRequest)
		return
	}

	hash, _ := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
	user.Password = string(hash)
	user.Role = "customer"
	db.Create(&user)
	w.WriteHeader(http.StatusCreated)
	fmt.Fprintln(w, "✅ User registered successfully")
}

// Login function
func login(w http.ResponseWriter, r *http.Request) {
	var input User
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "❌ Invalid data", http.StatusBadRequest)
		return
	}

	var user User
	if err := db.Where("email = ?", input.Email).First(&user).Error; err != nil {
		http.Error(w, "❌ Invalid credentials", http.StatusUnauthorized)
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(input.Password)); err != nil {
		http.Error(w, "❌ Invalid credentials", http.StatusUnauthorized)
		return
	}

	expirationTime := time.Now().Add(24 * time.Hour)
	claims := &Claims{
		Email: user.Email,
		Role:  user.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, _ := token.SignedString(jwtSecret)

	json.NewEncoder(w).Encode(map[string]string{"token": tokenString})
}

// Middleware to protect routes
func authMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		tokenStr := r.Header.Get("Authorization")
		if tokenStr == "" {
			log.Println("❌ Missing Authorization Header")
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		// Ensure "Bearer " prefix is removed
		tokenStr = strings.TrimPrefix(tokenStr, "Bearer ")
		if tokenStr == "" {
			log.Println("❌ Invalid Authorization Header Format")
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		// Parse JWT Token
		token, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(token *jwt.Token) (interface{}, error) {
			return jwtSecret, nil
		})
		if err != nil || !token.Valid {
			log.Println("❌ Invalid Token:", err)
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		// Token is valid, pass to the next handler
		next.ServeHTTP(w, r)
	})
}

// Get user details
func me(w http.ResponseWriter, r *http.Request) {
	tokenStr := r.Header.Get("Authorization")
	tokenStr = strings.TrimPrefix(tokenStr, "Bearer ")

	// Parse JWT
	token, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		return jwtSecret, nil
	})

	if err != nil || !token.Valid {
		log.Println("❌ Token Validation Failed:", err)
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Extract Claims
	claims, ok := token.Claims.(*Claims)
	if !ok {
		log.Println("❌ Failed to Extract Claims")
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	log.Printf("👤 User Authenticated: %s (%s)", claims.Email, claims.Role)
	json.NewEncoder(w).Encode(map[string]string{"email": claims.Email, "role": claims.Role})
}

func main() {
	connectDB()
	r := chi.NewRouter()
	r.Use(corsMiddleware()) // ✅ Apply CORS middleware

	r.Post("/auth/register", register)
	r.Post("/auth/login", login)
	r.Get("/auth/me", func(w http.ResponseWriter, r *http.Request) {
		authMiddleware(http.HandlerFunc(me)).ServeHTTP(w, r)
	})

	log.Println("🔐 Auth Service running on :8084")
	http.ListenAndServe(":8084", r)
}

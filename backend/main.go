package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"os"
	"log"
	"net/http"
	"strconv" 
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	_ "github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"
	"github.com/joho/godotenv"
)

// --- Models ---
type UserRole string

const (
	RoleManager    UserRole = "MANAGER"
	RoleTechnician UserRole = "TECHNICIAN"
)

type User struct {
	ID       int      `json:"id"`
	Email    string   `json:"email"`
	Password string   `json:"password"`
	Name     string   `json:"name"`
	Role     UserRole `json:"role"`
}

type Task struct {
	ID           int       `json:"id"`
	Title        string    `json:"title"`
	Description  string    `json:"description"`
	Status       string    `json:"status"`
	Priority     string    `json:"priority"`
	TechnicianID *int      `json:"technicianId"`
	Client       string    `json:"client"`
	CreatedAt    time.Time `json:"createdAt"`
}

var db *sql.DB

// Global variables or a config struct
var (
	jwtKey string
)

// getEnv helper to provide default values
func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}

// --- Initialization & DB Setup ---

func initDB() {
	// Fetch values from environment
    host     := os.Getenv("DB_HOST")
    dbUser   := os.Getenv("DB_USER")
    password := os.Getenv("DB_PASSWORD")
    dbname   := os.Getenv("DB_NAME")
    // Port is a string from Getenv, so we use %s in the Sprintf below
    port     := os.Getenv("DB_PORT")
	// Build connection string (Note: changed %d to %s for port)
	psqlInfo := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		host, port, dbUser, password, dbname)

	var err error
	db, err = sql.Open("postgres", psqlInfo)
	if err != nil {
		log.Fatal(err)
	}

	err = db.Ping()
	if err != nil {
		log.Fatalf("Cannot connect to Postgres at %s: %v", host, err)
	}

	fmt.Println("Successfully connected to PostgreSQL at", host)
	createTables()
}

func createTables() {
	queries := []string{
		`CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            name TEXT NOT NULL,
            role TEXT NOT NULL
        )`,
		`CREATE TABLE IF NOT EXISTS tasks (
            id SERIAL PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT,
            status TEXT DEFAULT 'PENDING',
            priority TEXT DEFAULT 'MEDIUM',
            technician_id INTEGER REFERENCES users(id),
            client TEXT NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )`,
	}

	for _, q := range queries {
		_, err := db.Exec(q)
		if err != nil {
			log.Fatal(err)
		}
	}
}

// --- Auth Handlers ---

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func loginHandler(w http.ResponseWriter, r *http.Request) {
	setupCORS(&w, r)
	if r.Method == http.MethodOptions {
		return
	}

	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	var user User
	err := db.QueryRow("SELECT id, email, password, name, role FROM users WHERE email = $1", req.Email).
		Scan(&user.ID, &user.Email, &user.Password, &user.Name, &user.Role)

	if err != nil {
		http.Error(w, "Invalid credentials", http.StatusUnauthorized)
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		http.Error(w, "Invalid credentials", http.StatusUnauthorized)
		return
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub":  user.ID,
		"role": user.Role,
		"exp":  time.Now().Add(time.Hour * 24).Unix(),
	})

	tokenString, _ := token.SignedString([]byte(jwtKey))

	json.NewEncoder(w).Encode(map[string]interface{}{
		"token": tokenString,
		"user":  user,
	})
}

func signupHandler(w http.ResponseWriter, r *http.Request) {
	setupCORS(&w, r)
	if r.Method == http.MethodOptions {
		return
	}

	var user User
	if err := json.NewDecoder(r.Body).Decode(&user); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	hashed, _ := bcrypt.GenerateFromPassword([]byte(user.Password), 10)

	err := db.QueryRow(
		"INSERT INTO users (email, password, name, role) VALUES ($1, $2, $3, $4) RETURNING id",
		user.Email, string(hashed), user.Name, user.Role,
	).Scan(&user.ID)

	if err != nil {
		http.Error(w, "User already exists or DB error", http.StatusConflict)
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(user)
}

// --- Task Handlers ---

func tasksHandler(w http.ResponseWriter, r *http.Request) {
	setupCORS(&w, r)
	if r.Method == http.MethodOptions {
		return
	}

	if r.Method == http.MethodGet {
		rows, err := db.Query("SELECT id, title, description, status, priority, technician_id, client, created_at FROM tasks ORDER BY created_at DESC")
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		tasks := []Task{}
		for rows.Next() {
			var t Task
			err := rows.Scan(&t.ID, &t.Title, &t.Description, &t.Status, &t.Priority, &t.TechnicianID, &t.Client, &t.CreatedAt)
			if err != nil {
				continue
			}
			tasks = append(tasks, t)
		}
		json.NewEncoder(w).Encode(tasks)
	} else if r.Method == http.MethodPost {
		var t Task
		if err := json.NewDecoder(r.Body).Decode(&t); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		err := db.QueryRow(
			"INSERT INTO tasks (title, description, status, priority, technician_id, client) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, created_at",
			t.Title, t.Description, t.Status, t.Priority, t.TechnicianID, t.Client,
		).Scan(&t.ID, &t.CreatedAt)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(t)
	}
}

// --- User Handlers ---

func userIDHandler(w http.ResponseWriter, r *http.Request) {
	setupCORS(&w, r)
	if r.Method == http.MethodOptions {
		return
	}

	idStr := strings.TrimPrefix(r.URL.Path, "/api/users/")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	if r.Method == http.MethodPut {
		var u User
		if err := json.NewDecoder(r.Body).Decode(&u); err != nil {
			http.Error(w, "Invalid JSON", http.StatusBadRequest)
			return
		}

		_, err := db.Exec(
			"UPDATE users SET name = $1, email = $2, role = $3 WHERE id = $4",
			u.Name, u.Email, u.Role, id,
		)
		if err != nil {
			http.Error(w, "Update failed: "+err.Error(), http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusOK)
		fmt.Fprintf(w, "User %d updated", id)

	} else if r.Method == http.MethodDelete {
		_, err := db.Exec("DELETE FROM users WHERE id = $1", id)
		if err != nil {
			http.Error(w, "Delete failed: "+err.Error(), http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	}
}

func taskIDHandler(w http.ResponseWriter, r *http.Request) {
	setupCORS(&w, r)
	if r.Method == http.MethodOptions {
		return
	}

	// Extract ID correctly
	idStr := strings.TrimPrefix(r.URL.Path, "/api/tasks/")
	if idStr == "" {
		http.Error(w, "Task ID required", http.StatusBadRequest)
		return
	}
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid Task ID", http.StatusBadRequest)
		return
	}

	if r.Method == http.MethodPut {
		var t Task
		if err := json.NewDecoder(r.Body).Decode(&t); err != nil {
			http.Error(w, "Invalid JSON body", http.StatusBadRequest)
			return
		}

		// LOG THE ATTEMPT (Helpful for debugging)
		// log.Printf("Updating task %d: Title=%s, Desc=%s, TechID=%v", id, t.Title, t.Description, t.TechnicianID)

		// PERFORM THE UPDATE
		result, err := db.Exec(
			`UPDATE tasks 
			 SET title = $1, description = $2, status = $3, priority = $4, technician_id = $5, client = $6 
			 WHERE id = $7`,
			t.Title, t.Description, t.Status, t.Priority, t.TechnicianID, t.Client, id,
		)

		if err != nil {
			log.Printf("DB Error: %v", err)
			http.Error(w, "Database update failed", http.StatusInternalServerError)
			return
		}

		rowsAffected, _ := result.RowsAffected()
		if rowsAffected == 0 {
			http.Error(w, "Task not found", http.StatusNotFound)
			return
		}

		w.WriteHeader(http.StatusOK)
		fmt.Fprintf(w, "Task %d updated successfully", id)

	} else if r.Method == http.MethodDelete {
		_, err := db.Exec("DELETE FROM tasks WHERE id = $1", id)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	}
}

func getTechniciansHandler(w http.ResponseWriter, r *http.Request) {
	setupCORS(&w, r)
	rows, err := db.Query("SELECT id, name, email, role FROM users WHERE role = 'TECHNICIAN'")
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var techs []User
	for rows.Next() {
		var u User
		rows.Scan(&u.ID, &u.Name, &u.Email, &u.Role)
		techs = append(techs, u)
	}
	json.NewEncoder(w).Encode(techs)
}

// NEW: Handler to get only managers
func getManagersHandler(w http.ResponseWriter, r *http.Request) {
	setupCORS(&w, r)
	rows, err := db.Query("SELECT id, name, email, role FROM users WHERE role = 'MANAGER'")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var managers []User
	for rows.Next() {
		var u User
		rows.Scan(&u.ID, &u.Name, &u.Email, &u.Role)
		managers = append(managers, u)
	}
	json.NewEncoder(w).Encode(managers)
}

// --- Middlewares & Helpers ---

func setupCORS(w *http.ResponseWriter, r *http.Request) {
	origin := os.Getenv("ALLOWED_ORIGIN")
	if origin == "" {
        origin = "*" 
    }
	(*w).Header().Set("Access-Control-Allow-Origin", origin)
	(*w).Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
	(*w).Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Authorization")
	if r.Method == "OPTIONS" {
        (*w).WriteHeader(http.StatusOK)
        return
    }
}

func updateUserRoleHandler(w http.ResponseWriter, r *http.Request) {
	setupCORS(&w, r)
	if r.Method == http.MethodOptions {
		return
	}
	parts := strings.Split(r.URL.Path, "/")
	if len(parts) < 4 {
		http.Error(w, "Invalid path", http.StatusBadRequest)
		return
	}
	userID := parts[3]
	var body struct {
		Role string `json:"role"`
	}
	json.NewDecoder(r.Body).Decode(&body)
	_, err := db.Exec("UPDATE users SET role = $1 WHERE id = $2", body.Role, userID)
	if err != nil {
		http.Error(w, "Update failed", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
}

func deleteUserHandler(w http.ResponseWriter, r *http.Request) {
	setupCORS(&w, r)
	if r.Method == http.MethodOptions {
		return
	}
	userID := strings.TrimPrefix(r.URL.Path, "/api/users/")
	_, err := db.Exec("DELETE FROM users WHERE id = $1", userID)
	if err != nil {
		http.Error(w, "Delete failed", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func main() {
	// Load .env file
	err := godotenv.Load()
	if err != nil {
		log.Println("Warning: No .env file found, using system environment variables")
	}

	// Initialize DB connection
	initDB() 

	// Get variables for use in handlers
	jwtKey = os.Getenv("JWT_SECRET")
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080" // fallback
	}

	// Auth
	http.HandleFunc("/api/auth/signup", signupHandler)
	http.HandleFunc("/api/auth/login", loginHandler)

	// Tasks
	http.HandleFunc("/api/tasks", tasksHandler)   // List & Create
	http.HandleFunc("/api/tasks/", taskIDHandler) // Update & Delete

	// Technicians & Users
	http.HandleFunc("/api/technicians", getTechniciansHandler)
	http.HandleFunc("/api/users/", userIDHandler)

	// Manager
	http.HandleFunc("/api/users/managers", getManagersHandler)

	fmt.Printf("Server starting on :%s...\n", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}
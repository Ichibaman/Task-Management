# 🛠️ Task Management System

A modern, full-stack Task Management application featuring a high-performance **Go** backend and a **React 19** frontend powered by **Bun** and **Vite**.

## 🏗️ Tech Stack

### Frontend

* **Core**: React 19
* **Build Tool**: Vite 7 with Bun runtime
* **Styling**: Tailwind CSS 4 & Lucide React icons
* **Type Safety**: TypeScript 5

### Backend

* **Language**: Go (Golang)
* **Database**: PostgreSQL with `lib/pq` driver
* **Authentication**: JWT (JSON Web Tokens) & Bcrypt password hashing
* **Configuration**: `godotenv` for environment variable management

---

## 🚀 Installation & Setup

### 1. Backend Configuration

1. Navigate to the directory: `cd backend`
2. Install Go dependencies:
```bash
go get github.com/joho/godotenv
go get github.com/golang-jwt/jwt/v5
go get golang.org/x/crypto/bcrypt
go get github.com/lib/pq

```


3. Create a `.env` file:
```env
DB_HOST=your_local_ip
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=tech_manager
JWT_SECRET=your_ultra_secret_key
PORT=8080
ALLOWED_ORIGIN=https://your-app.pages.dev

```


4. Start the server: `go run main.go`

### 2. Frontend Configuration

1. Navigate to the directory: `cd frontend`
2. Install dependencies using Bun:
```bash
bun install

```


3. Create a `.env` file:
```env
VITE_API_URL=https://api.yourdomain.com/api

```


4. Start the development server:
```bash
bun run dev

```



---

## 🌐 Deployment Logic

### Production Build

To prepare the frontend for Cloudflare Pages, run the build command which triggers the production environment logic (muting console logs for security):

```bash
bun run build

```

### Cloudflare Tunnel 

This app is designed to be hosted locally and exposed via Cloudflare Tunnel. Ensure your `cloudflared` configuration points to the port defined in your backend `.env` (default `:8080`).

---

## 🔑 Key Features

* **Production Muting**: Automatically disables `console.log` and `console.debug` in production builds to protect app logic.
* **Role-Based Access**: Supports `MANAGER` and `TECHNICIAN` roles.
* **CORS Protection**: Environment-driven CORS settings to secure backend-to-frontend communication.

---
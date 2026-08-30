# ProfileX Backend API

Production-ready, clean, secure REST API backend for the **ProfileX** mobile application built with **Node.js, Express, TypeScript**, and hosted on **Aiven MySQL**.

---

## 1. Architecture Overview

```text
Flutter App (ProfileX)
        ↓  HTTPS REST API
  Node.js + Express
        ↓  TLS / SSL
      mysql2
        ↓
 Aiven Hosted MySQL
```

> **IMPORTANT ARCHITECTURAL NOTE**:
> This backend is architected exclusively for **hosted remote MySQL (Aiven)**. Local MySQL, SQLite, Firebase, MongoDB, or local mock data are strictly prohibited. The Node.js server is the only entity that connects to the database using encrypted TLS.

---

## 2. Technology Stack

- **Runtime**: Node.js
- **Language**: TypeScript (Strict Mode)
- **Framework**: Express.js
- **Database Driver**: `mysql2/promise` (Connection Pooling + TLS/SSL)
- **Database Service**: Aiven Hosted MySQL
- **Authentication**: Stateless JSON Web Tokens (`jsonwebtoken`)
- **Password Hashing**: `bcrypt` (Cost Factor: 12)
- **Security**: `helmet`, `cors`, `express-rate-limit`
- **Validation**: `express-validator`
- **UUID**: `uuid` (v4 for primary keys)
- **Testing**: Jest + Supertest

---

## 3. Project Directory Structure

```text
profilex-backend/
├── src/
│   ├── config/
│   │   ├── database.ts          # mysql2 connection pool with SSL/TLS & retry/ping logic
│   │   └── env.ts               # Strongly-typed environment variable loader & validation
│   ├── controllers/
│   │   ├── auth.controller.ts   # Handles register, login, logout
│   │   └── profile.controller.ts# Handles get profile, update profile
│   ├── services/
│   │   ├── auth.service.ts      # Business logic: hashing, token generation, duplicate checks
│   │   └── profile.service.ts   # Business logic: profile retrieval & duplicate check on update
│   ├── repositories/
│   │   └── user.repository.ts   # Parameterized SQL queries for `users` table
│   ├── models/
│   │   └── user.model.ts        # TypeScript interfaces & types (User, UserCreateInput, etc.)
│   ├── routes/
│   │   ├── index.ts             # Mounts /api/v1 router
│   │   ├── auth.routes.ts       # Auth endpoints with rate limits & validators
│   │   └── profile.routes.ts    # Profile endpoints with auth middleware & validators
│   ├── middleware/
│   │   ├── auth.middleware.ts   # JWT Bearer token extraction and verification
│   │   ├── error.middleware.ts  # Centralized error handler, safe messages, DB error normalization
│   │   ├── rate-limit.middleware.ts # Standard & strict rate limiters
│   │   └── validate.middleware.ts   # express-validator result formatter
│   ├── validators/
│   │   ├── auth.validator.ts    # express-validator rules for register & login
│   │   └── profile.validator.ts # express-validator rules for profile update
│   ├── utils/
│   │   ├── errors.ts            # Typed AppError classes (ConflictError, UnauthorizedError, etc.)
│   │   ├── jwt.ts               # Sign and verify tokens
│   │   ├── password.ts          # bcrypt hash and compare helpers (cost factor 12)
│   │   └── response.ts          # Standardized API response format helpers
│   ├── app.ts                   # Express application setup
│   └── server.ts                # Server bootstrap & Aiven DB connection test
├── database/
│   └── schema.sql               # users table DDL with UUID PK and UNIQUE constraints
├── tests/
│   ├── unit/
│   │   ├── password.test.ts     # Unit tests for bcrypt hashing
│   │   └── jwt.test.ts          # Unit tests for JWT signing & verification
│   └── integration/
│       ├── auth.test.ts         # Registration, login, and logout tests
│       ├── profile.test.ts      # Profile retrieval, update, and auth middleware tests
│       └── health.test.ts       # Health check test
├── .env.example
├── .env
├── .gitignore
├── package.json
├── tsconfig.json
├── jest.config.ts
└── README.md
```

---

## 4. Requirements

- **Node.js** (v18+ recommended)
- **npm** (v9+)
- **Aiven Account & Hosted MySQL Service**

> **Note**: Local MySQL is NOT required. You do not need to install or run MySQL on your local machine.

---

## 5. Aiven MySQL Setup Guide

Follow these steps to set up your hosted database on Aiven:

1. **Sign in to Aiven**:
   - Go to [Aiven Console](https://console.aiven.io/) and create an account or sign in.
2. **Create a MySQL Service**:
   - Select **MySQL** as your service type.
   - Choose your preferred cloud provider and region (choose one close to your location).
   - Select the Free or Startup plan.
   - Set the service name to `profilex-mysql` and click **Create Service**.
3. **Obtain Connection Details**:
   - Once the service is running, navigate to the **Overview** tab.
   - Locate the **Connection information** section:
     - `Host`: (e.g. `mysql-xxxx-xxxx.aivencloud.com`)
     - `Port`: (e.g. `12345`)
     - `User`: (e.g. `avnadmin` or your custom app user)
     - `Password`: (Reveal and copy the password)
4. **Create the `profilex` Database**:
   - In the Aiven Console, go to the **Databases** tab.
   - Click **Add Database**, enter `profilex`, and click **Add**.
5. **Run the Database Schema**:
   - Open a database client connected to Aiven (such as DBeaver, MySQL Workbench, or the Aiven web client).
   - Execute the SQL statements from [`database/schema.sql`](file:///d:/Projects/profilex_backend/database/schema.sql) to create the `users` table:
     ```sql
     USE profilex;
     CREATE TABLE IF NOT EXISTS users (
         id CHAR(36) NOT NULL,
         name VARCHAR(100) NOT NULL,
         email VARCHAR(255) NOT NULL,
         mobile VARCHAR(20) NOT NULL,
         dob DATE NOT NULL,
         username VARCHAR(50) NOT NULL,
         password_hash VARCHAR(255) NOT NULL,
         created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
         updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
         PRIMARY KEY (id),
         UNIQUE KEY uq_users_email (email),
         UNIQUE KEY uq_users_mobile (mobile),
         UNIQUE KEY uq_users_username (username)
     ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
     ```
6. **Configure Credentials in `.env`**:
   - Update your `.env` file with your Aiven credentials (see below).

---

## 6. Environment Configuration

Create a `.env` file in the root directory (based on `.env.example`):

```env
NODE_ENV=development
PORT=5000

# Remote Aiven MySQL Credentials (Do NOT use localhost)
DB_HOST=your-aiven-mysql-host.aivencloud.com
DB_PORT=3306
DB_USER=avnadmin
DB_PASSWORD=your-aiven-password
DB_NAME=profilex

# SSL/TLS Configuration for Aiven
DB_SSL_REJECT_UNAUTHORIZED=true
# Optional: Path to custom CA certificate if needed
DB_CA_CERT=

# JWT Configuration
JWT_SECRET=super_strong_random_jwt_secret_key_change_in_production
JWT_EXPIRES_IN=7d

# CORS Allowed Origin
CORS_ORIGIN=*
```

---

## 7. Running the Application

### Install Dependencies
```bash
npm install
```

### Development Mode (with hot-reload)
```bash
npm run dev
```

### Build for Production
```bash
npm run build
```

### Start in Production
```bash
npm run start
```

### Run Automated Tests
```bash
npm test
```

---

## 8. API Documentation

Base URL:
```text
http://localhost:5000/api/v1
```

### Standard Response Format

**Success**:
```json
{
  "success": true,
  "message": "Success message",
  "data": {}
}
```

**Error**:
```json
{
  "success": false,
  "message": "Error description",
  "errors": []
}
```

---

### Endpoints

#### 1. Health Check
- **Method**: `GET`
- **URL**: `/health`
- **Authentication**: None
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "ProfileX API is running"
  }
  ```

---

#### 2. User Registration
- **Method**: `POST`
- **URL**: `/api/v1/auth/register`
- **Authentication**: None (Subject to strict rate limiting)
- **Request Body**:
  ```json
  {
    "name": "Priyanshu",
    "email": "user@example.com",
    "mobile": "9876543210",
    "dob": "2002-01-01",
    "username": "priyanshu",
    "password": "Password123"
  }
  ```
- **Validation Rules**:
  - `name`: Required, max 100 characters
  - `email`: Required, valid email format, max 255 characters (normalized to lowercase)
  - `mobile`: Required, 7-20 digits (optional leading `+`)
  - `dob`: Required, format `YYYY-MM-DD`, valid past date
  - `username`: Required, 3-50 characters, alphanumeric & underscore only
  - `password`: Required, minimum 8 characters, at least 1 letter and 1 number
- **Success Response (201 Created)**:
  ```json
  {
    "success": true,
    "message": "User registered successfully",
    "data": {
      "id": "7832bc93-4a11-4770-9831-c06fe1d1e434",
      "name": "Priyanshu",
      "email": "user@example.com",
      "mobile": "9876543210",
      "dob": "2002-01-01",
      "username": "priyanshu"
    }
  }
  ```
- **Error Responses**:
  - **400 Bad Request**: Malformed or missing fields
  - **409 Conflict**:
    - `"Email is already registered"`
    - `"Username is already taken"`
    - `"Mobile number is already registered"`
  - **429 Too Many Requests**: Exceeded rate limit (10 attempts / 15 mins)

---

#### 3. User Login
- **Method**: `POST`
- **URL**: `/api/v1/auth/login`
- **Authentication**: None (Subject to strict rate limiting)
- **Request Body**:
  ```json
  {
    "identifier": "priyanshu",
    "password": "Password123"
  }
  ```
  *(Note: `identifier` accepts either the registered email address or username).*
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Login successful",
    "data": {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "user": {
        "id": "7832bc93-4a11-4770-9831-c06fe1d1e434",
        "name": "Priyanshu",
        "email": "user@example.com",
        "mobile": "9876543210",
        "dob": "2002-01-01",
        "username": "priyanshu"
      }
    }
  }
  ```
- **Error Responses**:
  - **400 Bad Request**: Missing identifier or password
  - **401 Unauthorized**: `"Invalid credentials"`
  - **429 Too Many Requests**: Exceeded rate limit

---

#### 4. User Logout
- **Method**: `POST`
- **URL**: `/api/v1/auth/logout`
- **Authentication**: Required (`Bearer <JWT>`)
- **Headers**:
  ```text
  Authorization: Bearer <token>
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Logout successful"
  }
  ```
- **Error Responses**:
  - **401 Unauthorized**: Missing or invalid token

---

#### 5. Get User Profile
- **Method**: `GET`
- **URL**: `/api/v1/profile`
- **Authentication**: Required (`Bearer <JWT>`)
- **Headers**:
  ```text
  Authorization: Bearer <token>
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Profile retrieved successfully",
    "data": {
      "id": "7832bc93-4a11-4770-9831-c06fe1d1e434",
      "name": "Priyanshu",
      "email": "user@example.com",
      "mobile": "9876543210",
      "dob": "2002-01-01",
      "username": "priyanshu"
    }
  }
  ```
- **Error Responses**:
  - **401 Unauthorized**: Missing, expired, or invalid token
  - **404 Not Found**: User not found

---

#### 6. Update User Profile
- **Method**: `PUT`
- **URL**: `/api/v1/profile`
- **Authentication**: Required (`Bearer <JWT>`)
- **Headers**:
  ```text
  Authorization: Bearer <token>
  ```
- **Request Body**:
  ```json
  {
    "name": "Priyanshu Sharma",
    "mobile": "9876543211",
    "dob": "2002-01-02",
    "username": "priyanshu_s"
  }
  ```
  *(Note: `email` is strictly read-only and cannot be changed. Client-provided `userId` will be rejected).*
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Profile updated successfully",
    "data": {
      "id": "7832bc93-4a11-4770-9831-c06fe1d1e434",
      "name": "Priyanshu Sharma",
      "email": "user@example.com",
      "mobile": "9876543211",
      "dob": "2002-01-02",
      "username": "priyanshu_s"
    }
  }
  ```
- **Error Responses**:
  - **400 Bad Request**: Validation failed or attempted email update
  - **401 Unauthorized**: Missing, expired, or invalid token
  - **409 Conflict**:
    - `"Username is already taken"`
    - `"Mobile number is already registered"`

---

## 9. Security Implementations

- **Parameterized SQL Queries**: All queries utilize `?` placeholders via `mysql2/promise` to prevent SQL Injection.
- **Password Hashing**: Passwords are securely hashed with `bcrypt` using 12 salt rounds before storage.
- **Never Leaked Secrets**: `password_hash`, database credentials, and `JWT_SECRET` are never exposed in API responses or logs.
- **Client ID Isolation**: Profile operations always derive the user ID from the verified JWT payload, rejecting client-provided IDs.
- **Rate Limiting**: Tiered rate limiting with strict limits (10 req / 15 min) on login and registration to mitigate brute force attacks.
- **Security Headers**: Standard security headers enforced via `helmet`.
- **CORS Protection**: Environment-controlled origins via `CORS_ORIGIN`.

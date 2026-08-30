-- =============================================================================
-- ProfileX Database Schema for Hosted Aiven MySQL
-- Database: profilex
-- =============================================================================

CREATE DATABASE IF NOT EXISTS profilex;
USE profilex;

-- Drop table if re-running migration
-- DROP TABLE IF EXISTS users;

CREATE TABLE IF NOT EXISTS users (
    id CHAR(36) NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    mobile VARCHAR(20) NOT NULL,
    dob DATE NOT NULL,
    username VARCHAR(50) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    failed_attempts INT NOT NULL DEFAULT 0,
    is_locked TINYINT(1) NOT NULL DEFAULT 0,
    locked_at TIMESTAMP NULL DEFAULT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    UNIQUE KEY uq_users_email (email),
    UNIQUE KEY uq_users_mobile (mobile),
    UNIQUE KEY uq_users_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

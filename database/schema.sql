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
    lock_until TIMESTAMP NULL DEFAULT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    UNIQUE KEY uq_users_email (email),
    UNIQUE KEY uq_users_mobile (mobile),
    UNIQUE KEY uq_users_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- Login History Table
-- Records every authentication attempt (success, wrong password, lockout)
-- =============================================================================

CREATE TABLE IF NOT EXISTS login_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL,
    identifier VARCHAR(255) NOT NULL,
    status ENUM('SUCCESS', 'FAILED', 'LOCKED') NOT NULL,
    failure_reason VARCHAR(255) NULL,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    attempted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    KEY idx_login_history_user_id (user_id),
    KEY idx_login_history_identifier (identifier),
    KEY idx_login_history_attempted_at (attempted_at),

    CONSTRAINT fk_login_history_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


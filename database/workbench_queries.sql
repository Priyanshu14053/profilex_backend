-- =============================================================================
-- ProfileX — MySQL Workbench Administration & Inspection Queries
-- Database: profilex
-- =============================================================================

USE profilex;

-- =============================================================================
-- 1. USER MANAGEMENT & STATUS QUERIES
-- =============================================================================

-- 1.1 View all registered users with their current lockout and attempt status
SELECT 
    id,
    name,
    username,
    email,
    mobile,
    dob,
    failed_attempts,
    is_locked,
    locked_at,
    created_at,
    updated_at
FROM users
ORDER BY created_at DESC;

-- 1.2 View only currently locked accounts
SELECT 
    id,
    name,
    username,
    email,
    mobile,
    failed_attempts,
    is_locked,
    locked_at
FROM users
WHERE is_locked = 1 OR failed_attempts >= 3
ORDER BY locked_at DESC;

-- 1.3 Find a specific user by username, email, or mobile
SELECT 
    id,
    name,
    username,
    email,
    mobile,
    failed_attempts,
    is_locked,
    locked_at
FROM users
WHERE username = 'priyanshu' OR email = 'user@example.com';


-- =============================================================================
-- 2. UNLOCKING & ACCOUNT MANAGEMENT QUERIES
-- =============================================================================

-- 2.1 Unlock a user by username (resets lock flag, attempts, and timestamp)
UPDATE users
SET 
    is_locked = 0,
    failed_attempts = 0,
    locked_at = NULL
WHERE username = 'priyanshu';

-- 2.2 Unlock a user by email
UPDATE users
SET 
    is_locked = 0,
    failed_attempts = 0,
    locked_at = NULL
WHERE email = 'user@example.com';

-- 2.3 Unlock ALL locked accounts at once
UPDATE users
SET 
    is_locked = 0,
    failed_attempts = 0,
    locked_at = NULL
WHERE is_locked = 1 OR failed_attempts > 0;

-- 2.4 Manually lock a user account
UPDATE users
SET 
    is_locked = 1,
    failed_attempts = 3,
    locked_at = CURRENT_TIMESTAMP
WHERE username = 'priyanshu';


-- =============================================================================
-- 3. LOGIN HISTORY QUERIES
-- =============================================================================

-- 3.1 View all login history entries (most recent first)
SELECT 
    id,
    user_id,
    identifier,
    status,
    failure_reason,
    ip_address,
    user_agent,
    attempted_at
FROM login_history
ORDER BY attempted_at DESC
LIMIT 100;

-- 3.2 View complete login history joined with user details
SELECT 
    lh.id AS log_id,
    COALESCE(u.name, 'Unknown / Not Found') AS user_name,
    COALESCE(u.email, lh.identifier) AS email_or_identifier,
    u.username,
    lh.status,
    lh.failure_reason,
    lh.ip_address,
    lh.user_agent,
    lh.attempted_at
FROM login_history lh
LEFT JOIN users u ON lh.user_id = u.id
ORDER BY lh.attempted_at DESC
LIMIT 100;

-- 3.3 View only failed and locked login attempts (security audit)
SELECT 
    lh.id,
    lh.identifier,
    lh.status,
    lh.failure_reason,
    lh.ip_address,
    lh.user_agent,
    lh.attempted_at
FROM login_history lh
WHERE lh.status IN ('FAILED', 'LOCKED')
ORDER BY lh.attempted_at DESC;

-- 3.4 View only successful logins
SELECT 
    lh.id,
    COALESCE(u.name, 'Unknown') AS user_name,
    lh.identifier,
    lh.ip_address,
    lh.attempted_at
FROM login_history lh
LEFT JOIN users u ON lh.user_id = u.id
WHERE lh.status = 'SUCCESS'
ORDER BY lh.attempted_at DESC;

-- 3.5 View login history for a specific user
SELECT 
    lh.id,
    lh.identifier,
    lh.status,
    lh.failure_reason,
    lh.ip_address,
    lh.user_agent,
    lh.attempted_at
FROM login_history lh
WHERE lh.identifier = 'priyanshu' OR lh.identifier = 'user@example.com'
ORDER BY lh.attempted_at DESC;


-- =============================================================================
-- 4. SUMMARY & ANALYTICS QUERIES
-- =============================================================================

-- 4.1 Total count of users and locked users
SELECT 
    COUNT(*) AS total_users,
    SUM(CASE WHEN is_locked = 1 OR failed_attempts >= 3 THEN 1 ELSE 0 END) AS locked_users,
    SUM(CASE WHEN is_locked = 0 AND failed_attempts < 3 THEN 1 ELSE 0 END) AS active_users
FROM users;

-- 4.2 Breakdown of login attempts by status
SELECT 
    status,
    COUNT(*) AS total_attempts
FROM login_history
GROUP BY status;

-- 4.3 Top failed login identifiers (detect potential brute force targets)
SELECT 
    identifier,
    COUNT(*) AS failed_count,
    MAX(attempted_at) AS last_attempt_at
FROM login_history
WHERE status IN ('FAILED', 'LOCKED')
GROUP BY identifier
ORDER BY failed_count DESC
LIMIT 10;

CREATE DATABASE IF NOT EXISTS storesync_db;
USE storesync_db;
CREATE TABLE IF NOT EXISTS products(
id INT AUTO_INCREMENT PRIMARY KEY,
product_name VARCHAR(255),
barcode VARCHAR(100),
category VARCHAR(100),
quantity INT DEFAULT 0,
price DECIMAL(10,2),
expiry_date DATE,
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users table for manager & worker accounts
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role ENUM('manager','worker') NOT NULL DEFAULT 'worker',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Default manager account (password: admin123)
INSERT IGNORE INTO users (username, password, full_name, role, is_active)
VALUES ('manager', 'admin123', 'Store Manager', 'manager', 1);

-- Default worker account (password: worker123)
INSERT IGNORE INTO users (username, password, full_name, role, is_active)
VALUES ('worker', 'worker123', 'Store Worker', 'worker', 1);
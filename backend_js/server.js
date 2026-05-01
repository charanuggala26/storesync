const express = require("express");
const mysql = require("mysql2/promise");
const path = require("path");

const app = express();

/* =========================
   MIDDLEWARE
========================= */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const frontend = path.join(__dirname, "..", "frontend");
app.use(express.static(frontend));

/* =========================
   MYSQL CONNECTION
========================= */
const db = mysql.createPool({
    host: "localhost",
    user: "root",
    password: "root",
    database: "storesync_db",
    waitForConnections: true,
    connectionLimit: 10
});

/* =========================
   AUTO-INIT USERS TABLE
========================= */
async function initUsersTable() {
    try {
        await db.execute(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(100) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                full_name VARCHAR(255) NOT NULL,
                role ENUM('manager','worker') NOT NULL DEFAULT 'worker',
                is_active TINYINT(1) NOT NULL DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        // Seed default accounts if they don't exist
        await db.execute(
            "INSERT IGNORE INTO users (username, password, full_name, role, is_active) VALUES (?, ?, ?, 'manager', 1)",
            ['manager', 'admin123', 'Store Manager']
        );
        await db.execute(
            "INSERT IGNORE INTO users (username, password, full_name, role, is_active) VALUES (?, ?, ?, 'worker', 1)",
            ['worker', 'worker123', 'Store Worker']
        );
        console.log("✅ Users table ready (default accounts seeded)");
    } catch (err) {
        console.error("❌ Failed to init users table:", err.message);
    }
}
initUsersTable();

/* =========================
   LOGIN
========================= */
app.post("/api/login", async (req, res) => {
    try {
        const { username, password, role } = req.body;
        const [rows] = await db.execute(
            "SELECT id, username, full_name, role, is_active FROM users WHERE username = ? AND password = ? AND role = ?",
            [username, password, role]
        );
        if (!rows.length) {
            return res.status(401).json({ message: "Invalid credentials" });
        }
        const user = rows[0];
        if (!user.is_active) {
            return res.status(403).json({ message: "Account is disabled. Contact your manager." });
        }
        res.json({ success: true, user: { id: user.id, username: user.username, name: user.full_name, role: user.role } });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Server error" });
    }
});

/* =========================
   GET ALL WORKERS (manager only)
========================= */
app.get("/api/workers", async (req, res) => {
    try {
        const [rows] = await db.execute(
            "SELECT id, username, full_name, role, is_active, created_at FROM users WHERE role = 'worker' ORDER BY created_at DESC"
        );
        res.json(rows);
    } catch (error) {
        console.log(error);
        res.json([]);
    }
});

/* =========================
   ADD WORKER (manager only)
========================= */
app.post("/api/workers", async (req, res) => {
    try {
        const { username, password, full_name } = req.body;
        if (!username || !password || !full_name) {
            return res.status(400).json({ message: "Username, password and full name are required" });
        }
        await db.execute(
            "INSERT INTO users (username, password, full_name, role, is_active) VALUES (?, ?, ?, 'worker', 1)",
            [username.trim(), password, full_name.trim()]
        );
        res.json({ success: true, message: "Worker added successfully" });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: "Username already exists" });
        }
        console.log(error);
        res.status(500).json({ message: "Failed to add worker" });
    }
});

/* =========================
   TOGGLE WORKER STATUS (enable/disable)
========================= */
app.put("/api/workers/:id/toggle", async (req, res) => {
    try {
        const id = Number(req.params.id);
        const [rows] = await db.execute("SELECT is_active, role FROM users WHERE id = ?", [id]);
        if (!rows.length) return res.status(404).json({ message: "Worker not found" });
        if (rows[0].role === 'manager') return res.status(403).json({ message: "Cannot modify manager accounts" });
        const newStatus = rows[0].is_active ? 0 : 1;
        await db.execute("UPDATE users SET is_active = ? WHERE id = ?", [newStatus, id]);
        res.json({ success: true, is_active: newStatus });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Failed to update worker status" });
    }
});

/* =========================
   DELETE WORKER (manager only)
========================= */
app.delete("/api/workers/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);
        const [rows] = await db.execute("SELECT role FROM users WHERE id = ?", [id]);
        if (!rows.length) return res.status(404).json({ message: "Worker not found" });
        if (rows[0].role === 'manager') return res.status(403).json({ message: "Cannot delete manager accounts" });
        await db.execute("DELETE FROM users WHERE id = ?", [id]);
        res.json({ success: true });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Failed to delete worker" });
    }
});
/*
   GET ALL PRODUCTS
========================= */
app.get("/api/products", async (req, res) => {
    try {
        const [rows] = await db.execute(
            "SELECT * FROM products ORDER BY id DESC"
        );
        res.json(rows);
    } catch (error) {
        console.log(error);
        res.json([]);
    }
});

/* =========================
   ADD PRODUCT
========================= */
app.post("/api/products", async (req, res) => {
    try {
        const p = req.body;

        await db.execute(
            `INSERT INTO products
            (product_name, barcode, category, quantity, price, expiry_date)
            VALUES (?, ?, ?, ?, ?, ?)`,
            [
                p.product_name || "",
                p.barcode || "",
                p.category || "",
                Number(p.quantity || 0),
                Number(p.price || 0),
                p.expiry_date || null
            ]
        );

        res.json({ success: true });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            message: "Failed to add product"
        });
    }
});

/* =========================
   DELETE PRODUCT
========================= */
app.delete("/api/products/:id", async (req, res) => {
    try {
        await db.execute(
            "DELETE FROM products WHERE id = ?",
            [req.params.id]
        );

        res.json({ success: true });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            message: "Delete failed"
        });
    }
});

/* =========================
   BILLING - REDUCE STOCK
========================= */
app.post("/api/billing", async (req, res) => {
    try {
        const id = Number(req.body.id);
        const qty = Number(req.body.qty || 1);

        await db.execute(
            `UPDATE products
             SET quantity = GREATEST(quantity - ?,0)
             WHERE id = ?`,
            [qty, id]
        );

        res.json({ success: true });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            message: "Billing update failed"
        });
    }
});

/* =========================
   UPDATE STOCK + EXPIRY
========================= */
app.put("/api/products/:id/stock", async (req, res) => {
    try {

        const id = Number(req.params.id);
        const addQty = Number(req.body.add_quantity || 0);
        const expiry = req.body.expiry_date || null;

        if (!id || addQty <= 0) {
            return res.status(400).json({
                message: "Invalid product id or quantity"
            });
        }

        // update stock
        await db.execute(
            "UPDATE products SET quantity = quantity + ? WHERE id = ?",
            [addQty, id]
        );

        // update expiry date if entered
        if (expiry) {
            await db.execute(
                "UPDATE products SET expiry_date = ? WHERE id = ?",
                [expiry, id]
            );
        }

        res.json({
            success: true,
            message: "Stock updated successfully"
        });

    } catch (error) {

        console.log("STOCK UPDATE ERROR:", error);

        res.status(500).json({
            message: "Server error while updating stock"
        });
    }
});

/* =========================
   ALERTS
========================= */
app.get("/api/alerts", async (req, res) => {
    try {

        const [rows] = await db.execute(
            "SELECT * FROM products"
        );

        let alerts = [];

        rows.forEach((x) => {

            if (x.quantity <= 0) {
                alerts.push({
                    type: "out",
                    msg: x.product_name + " out of stock"
                });
            } else if (x.quantity < 5) {
                alerts.push({
                    type: "low",
                    msg: x.product_name + " low stock"
                });
            }

            if (x.expiry_date) {
                let days =
                    (new Date(x.expiry_date) - new Date()) / 86400000;

                if (days <= 7) {
                    alerts.push({
                        type: "exp",
                        msg: x.product_name + " expiring soon"
                    });
                }
            }

        });

        res.json(alerts);

    } catch (error) {
        console.log(error);
        res.json([]);
    }
});

/* =========================
   HOME PAGE
========================= */
app.get("/", (req, res) => {
    res.sendFile(
        path.join(frontend, "login.html")
    );
});

/* =========================
   START SERVER
========================= */
app.listen(5000, () => {
    console.log("StoreSync running at http://localhost:5000");
});
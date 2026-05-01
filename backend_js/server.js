require('dotenv').config();
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
    uri: process.env.MYSQL_URL,
    waitForConnections: true,
    connectionLimit: 10
});


/* =========================
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
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(process.env.PORT || 5000, () => {
  console.log("StoreSync running on port " + (process.env.PORT || 5000));
});

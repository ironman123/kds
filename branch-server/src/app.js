import express from "express";
import http from "http";
import path from "path";
import cors from "cors";
import { fileURLToPath } from "url";
import db from "./db.js";

// 1. Service Imports
import { initSocket } from "./infra/socketService.js"; // ✅ New Socket Service

// 2. Route Imports
import authRoutes from "./auth/authController.js";   // ✅ New Auth
import menuRoutes from "./api/menu.routes.js";
import orderRoutes from "./api/orders.routes.js"
import branchRoutes from "./api/branch.routes.js";
import tablesRoutes from "./api/tables.routes.js";
import staffRoutes from "./api/staff.routes.js";  // ✅ New Staff

// 3. Middleware Imports
import { requireAuth } from "./auth/authMiddleware.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// --- GLOBAL MIDDLEWARE ---
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

// --- ROUTES ---

// A. PUBLIC ROUTES (Login / Register / Public Menu)
app.use("/api/auth", authRoutes);
app.use("/api/menu", menuRoutes); // Usually public for customers

// B. PROTECTED ROUTES (Require Valid Token)
// The 'requireAuth' middleware will check the token and set 'req.context' securely.
app.use("/api/orders", requireAuth, orderRoutes);
app.use("/api/staff", requireAuth, staffRoutes);
app.use("/api/tables", requireAuth, tablesRoutes);
app.use("/api/branches", requireAuth, branchRoutes);

// --- ERROR HANDLING ---
app.use((err, req, res, next) =>
{
    console.error("🔥 Server Error:", err.message);
    const status = err.message.includes("not found") || err.message.includes("required") ? 400 : 500;
    res.status(status).json({ error: err.message });
});

// --- SERVER STARTUP ---
const server = http.createServer(app);

// Initialize Real-Time Sockets
initSocket(server);

async function startServer()
{
    try
    {
        console.log("Checking database migrations...");
        await db.migrate.latest();
        console.log("Database is up to date!");

        server.listen(3000, '0.0.0.0', () =>
        {
            console.log(`
            🚀 Server running on http://localhost:3000
            ------------------------------------------
            🔒 Auth:   http://localhost:3000/api/auth
            🍔 Menu:   http://localhost:3000/api/menu
            🧾 Orders: http://localhost:3000/api/orders (Protected)
            👥 Staff:  http://localhost:3000/api/staff (Protected)
            `);
        });
    } catch (error)
    {
        console.log("Failed to start server: ", error);
        process.exit(1);
    }
}

startServer();
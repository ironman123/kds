import express from "express";
import http from "http";
import path from "path";
import cors from "cors"; // 1. Add CORS
import { fileURLToPath } from "url";
import db from "./db.js";

// Route Imports
import menuRoutes from "./api/menu.routes.js";
//import orderRoutes from "./api/orders.routes.js";
//import kdsRoutes from "./api/kds.routes.js";
import branchRoutes from "./api/branch.routes.js";
import tablesRoutes from "./api/tables.routes.js";
import staffRoutes from "./api/staff.routes.js";

// Infra Imports
import { initKdsWebSocket } from "./infra/kds.ws.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// 2. Essential Middleware
app.use(cors()); // Allow frontend requests
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

// 3. Context Middleware (CRITICAL for your new Services)
// This extracts the IDs from the frontend headers and makes them available to your services
app.use((req, res, next) =>
{
    // Read headers (case-insensitive)
    const actorId = req.headers['x-actor-id'];
    const branchId = req.headers['x-branch-id'];

    // Attach to request object
    req.context = {
        actorId: actorId || null,
        branchId: branchId || null
    };

    // Optional: Log for debugging
    if (req.path.startsWith('/api'))
    {
        console.log(`[${req.method}] ${req.url} | Actor: ${actorId} | Branch: ${branchId}`);
    }

    next();
});

// 4. Mount Routes
// Note: With "app.use('/api/menu', menuRoutes)", your URLs will be:
// http://localhost:3000/api/menu/categories
// http://localhost:3000/api/menu/items
app.use("/api/menu", menuRoutes);
//app.use("/api/orders", orderRoutes);
//app.use("/api/kds", kdsRoutes);
app.use("/api/branches", branchRoutes);
app.use("/api/tables", tablesRoutes);
app.use("/api/staff", staffRoutes);

// 5. Global Error Handler (Catches service errors)
app.use((err, req, res, next) =>
{
    console.error("🔥 Server Error:", err.message);
    // Return 400 for logic errors, 500 for crashes
    const status = err.message.includes("not found") || err.message.includes("required") ? 400 : 500;
    res.status(status).json({ error: err.message });
});

const server = http.createServer(app);

initKdsWebSocket(server);

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
            👉 Menu API: http://localhost:3000/api/menu/items
            👉 Listening for headers: x-actor-id, x-branch-id
            `);
        });
    } catch (error)
    {
        console.log("Failed to start server: ", error);
        process.exit(1);
    }
}

startServer();
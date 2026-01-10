import express from "express";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";

import menuRoutes from "./api/menu.routes.js";
import orderRoutes from "./api/orders.routes.js";
import kdsRoutes from "./api/kds.routes.js";
//import staffRoutes from "./api/staff.routes.js";
import { initKdsWebSocket } from "./infra/kds.ws.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

app.use("/api/menu", menuRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/kds", kdsRoutes);
//app.use("/api/staff", staffRoutes);

const server = http.createServer(app);

initKdsWebSocket(server);

server.listen(3003, () =>
{
    console.log("Server running on http://localhost:3003");
});

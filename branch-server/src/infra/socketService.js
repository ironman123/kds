import { Server } from "socket.io";
import jwt from "jsonwebtoken";

let io;

export function initSocket(httpServer)
{
    io = new Server(httpServer, {
        cors: {
            origin: "*", // Allow Frontend to connect
            methods: ["GET", "POST"]
        }
    });

    // 🔒 AUTH MIDDLEWARE (The Bouncer)
    io.use((socket, next) =>
    {
        const token = socket.handshake.auth.token;
        if (!token) return next(new Error("Authentication error"));

        try
        {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || "yolo");
            socket.user = decoded;
            next();
        } catch (err)
        {
            next(new Error("Invalid Token"));
        }
    });

    io.on("connection", (socket) =>
    {
        const { branchId, role, username } = socket.user;

        console.log(`🔌 Connected: ${username} (${role})`);

        // Join Rooms
        socket.join(`branch:${branchId}`);
        socket.join(`branch:${branchId}:role:${role}`);
    });
}

// --- TRIGGERS (Call these from your API Controllers) ---

export function notifyNewOrder(branchId, order)
{
    if (io) io.to(`branch:${branchId}:role:KITCHEN`).emit("kds:new_order", order);
}

export function notifyOrderStatus(branchId, order)
{
    if (io) io.to(`branch:${branchId}`).emit("order:update", order);
}
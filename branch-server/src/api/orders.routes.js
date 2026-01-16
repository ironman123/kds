import express from "express";

import {
createOrder,
getOrderById,
getActiveOrders,
getOrdersForTable,
} from "../orders/orderService.js";

import {
addItemToOrder,
changeOrderItemStatus,
} from "../orders/orderItemService.js";

const router = express.Router();

/* =========================
   ORDERS
========================= */

/**
 * Create a new order
 * waiter / captain only
 */
router.post("/orders", (req, res) => {
    try {
        const order = createOrder({
            tableId: req.body.tableId,
            waiterId: req.body.waiterId,
            servePolicy: req.body.servePolicy,
            customerName: req.body.customerName,
            customerPhone: req.body.customerPhone,
            branchId: req.body.branchId,
        });

        res.json(order);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

/**
 * Get order by ID
 */
router.get("/orders/:id", (req, res) => {
    try {
        const order = getOrderById(req.params.id);
        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }
        res.json(order);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

/**
 * Get all active (non-completed) orders
 * used by captain / kitchen / KDS
 */
router.get("/orders", (req, res) => {
    try {
        const branchId = req.headers['x-branch-id'] || req.query.branchId;

        if (!branchId) return res.status(400).json({ error: "Branch ID required" });

        res.json(getActiveOrders(branchId));
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

/**
 * Get orders for a table
 */
router.get("/tables/:tableId/orders", (req, res) => {
    try {
        const orders = getOrdersForTable(req.params.tableId);
        res.json(orders);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

/* =========================
   ORDER ITEMS
========================= */

/**
 * Add item to order
 * waiter / captain only
 */
router.post("/orders/:orderId/items", (req, res) => {
    try {
        const item = addItemToOrder({
            orderId: req.params.orderId,
            menuItemId: req.body.menuItemId,
            quantity: req.body.quantity,
            notes: req.body.notes,
            actorId: req.body.actorId
        });

        res.json(item);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

/**
 * Change order item status
 * kitchen / captain
 */
router.patch("/order-items/:itemId/status", (req, res) => {
    try {
        changeOrderItemStatus({
            itemId: req.params.itemId,
            newStatus: req.body.status,
            actorId: req.body.actorId,
        });

        res.json({ ok: true });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

export default router;

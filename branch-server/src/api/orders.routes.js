import express from "express";
import
{
    createOrder,
    getOrderById,
    getActiveOrders,
    getOrdersForTable,
    changeOrderStatus,
    transferTable
} from "../orders/orderService.js";
import
{
    addItemToOrder,
    changeOrderItemStatus
} from "../orders/orderItemService.js";

const router = express.Router();

// ------------------------------------------------------------------
// 🛒 ORDER MANAGEMENT (Waiter / POS)
// ------------------------------------------------------------------

// 1. Create a New Order
// POST /api/orders
// Body: { tableId, waiterId, servePolicy, customerName, customerPhone }
router.post("/", async (req, res) =>
{
    try
    {
        const result = await createOrder({
            ...req.body,
            branchId: req.context.branchId, // From Middleware
            actorId: req.context.actorId    // From Middleware
        });
        res.status(201).json(result);
    } catch (e)
    {
        res.status(400).json({ error: e.message });
    }
});

// 2. Get All Active Orders (Kitchen Display / POS Dashboard)
// GET /api/orders/active
router.get("/active", async (req, res) =>
{
    try
    {
        const result = await getActiveOrders(req.context.branchId);
        res.json(result);
    } catch (e)
    {
        res.status(400).json({ error: e.message });
    }
});

// 3. Get Specific Order Details
// GET /api/orders/:id
router.get("/:id", async (req, res) =>
{
    try
    {
        const result = await getOrderById(req.params.id, req.context.branchId);
        if (!result) return res.status(404).json({ error: "Order not found" });
        res.json(result);
    } catch (e)
    {
        res.status(400).json({ error: e.message });
    }
});

// 4. Get Orders for a Table (Table View)
// GET /api/orders/table/:tableId
router.get("/table/:tableId", async (req, res) =>
{
    try
    {
        const result = await getOrdersForTable(req.params.tableId, req.context.branchId);
        res.json(result);
    } catch (e)
    {
        res.status(400).json({ error: e.message });
    }
});

// 5. Change Order Status (e.g., PLACED -> CANCELLED, READY -> SERVED)
// PATCH /api/orders/:id/status
// Body: { newStatus: "CANCELLED" }
router.patch("/:id/status", async (req, res) =>
{
    try
    {
        const result = await changeOrderStatus({
            orderId: req.params.id,
            newStatus: req.body.newStatus,
            branchId: req.context.branchId,
            actorId: req.context.actorId
        });
        res.json(result);
    } catch (e)
    {
        res.status(400).json({ error: e.message });
    }
});

// 6. Transfer Table (Change Waiter)
// PATCH /api/orders/:id/transfer
// Body: { newWaiterId: "uuid" }
router.patch("/:id/transfer", async (req, res) =>
{
    try
    {
        const result = await transferTable({
            orderId: req.params.id,
            newWaiterId: req.body.newWaiterId,
            branchId: req.context.branchId,
            actorId: req.context.actorId
        });
        res.json(result);
    } catch (e)
    {
        res.status(400).json({ error: e.message });
    }
});

// ------------------------------------------------------------------
// 🍔 ORDER ITEMS (Adding Food / Kitchen Status)
// ------------------------------------------------------------------

// 7. Add Item to Order
// POST /api/orders/:id/items
// Body: { menuItemId, quantity, notes }
router.post("/:id/items", async (req, res) =>
{
    try
    {
        const result = await addItemToOrder({
            orderId: req.params.id,
            ...req.body,
            branchId: req.context.branchId,
            actorId: req.context.actorId
        });
        res.status(201).json(result);
    } catch (e)
    {
        res.status(400).json({ error: e.message });
    }
});

// 8. Update Item Status (Kitchen Display System - KDS)
// PATCH /api/orders/items/:itemId/status
// Body: { newStatus: "PREPARING" }
// NOTE: This route is specific to an ITEM, not the whole order
router.patch("/items/:itemId/status", async (req, res) =>
{
    try
    {
        const result = await changeOrderItemStatus({
            itemId: req.params.itemId,
            newStatus: req.body.newStatus,
            branchId: req.context.branchId,
            actorId: req.context.actorId
        });
        res.json({ ok: true, message: "Item status updated" });
    } catch (e)
    {
        res.status(400).json({ error: e.message });
    }
});

export default router;
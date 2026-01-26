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
import { requireAuth } from "../auth/authMiddleware.js";
import { requirePermission } from "../auth/authorizationService.js";
import { PERMISSIONS } from "../auth/permissions.js";

const router = express.Router();

// 1. Authenticate everyone
router.use(requireAuth);

// ------------------------------------------------------------------
// 🛒 ORDER MANAGEMENT (Waiter / POS)
// ------------------------------------------------------------------

// 1. Create a New Order
// Permission: ORDER_CREATE (Waiters, Captains, Managers)
router.post("/", requirePermission(PERMISSIONS.ORDER_CREATE), async (req, res) =>
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
// Permission: ORDER_VIEW
router.get("/active", requirePermission(PERMISSIONS.ORDER_VIEW), async (req, res) =>
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
// Permission: ORDER_VIEW
router.get("/:id", requirePermission(PERMISSIONS.ORDER_VIEW), async (req, res) =>
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
// Permission: ORDER_VIEW
router.get("/table/:tableId", requirePermission(PERMISSIONS.ORDER_VIEW), async (req, res) =>
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
// Permission: ORDER_UPDATE (Waiters can serve, Managers can cancel)
// Ideally, Voiding/Cancelling might need specific perms, but for now generic UPDATE covers it.
router.patch("/:id/status", requirePermission(PERMISSIONS.ORDER_UPDATE), async (req, res) =>
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
// Permission: ORDER_UPDATE (or stricter if you prefer)
router.patch("/:id/transfer", requirePermission(PERMISSIONS.ORDER_UPDATE), async (req, res) =>
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
// Permission: ORDER_CREATE (Adding items is like creating a sub-order)
router.post("/:id/items", requirePermission(PERMISSIONS.ORDER_CREATE), async (req, res) =>
{
    try
    {
        const result = await addItemToOrder({
            orderId: req.params.id,
            ...req.body, // { menuItemId, quantity, notes }
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
// Permission: ORDER_UPDATE (Chefs need this to mark items as COOKING/READY)
router.patch("/items/:itemId/status", requirePermission(PERMISSIONS.ORDER_UPDATE), async (req, res) =>
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
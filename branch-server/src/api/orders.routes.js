import express from "express";
import
    {
        createOrder,
        getActiveOrders,
        getOrderById,
        getOrdersForTable,
        changeOrderStatus,
        transferTable
    } from "../orders/orderService.js";
import
    {
        addItemToOrder,
        changeOrderItemStatus,
        removeOrderItem
    } from "../orders/orderItemService.js";
import { requireAuth } from "../auth/authMiddleware.js";
import { requirePermission } from "../auth/authorizationService.js";
import { PERMISSIONS } from "../auth/permissions.js";

const router = express.Router();

router.use(requireAuth);

// --- 1. LIST ROUTES (Specific routes FIRST) ---

// GET /active -> Kitchen Display / Dashboard
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

// GET / -> Root list (Catches "GET /orders" from frontend)
router.get("/", requirePermission(PERMISSIONS.ORDER_VIEW), async (req, res) =>
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

// GET /table/:tableId -> Table specific
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

// --- 2. DETAIL ROUTES (Dynamic :id LAST) ---

// GET /:id -> Specific Order
router.get("/:id", requirePermission(PERMISSIONS.ORDER_VIEW), async (req, res) =>
{
    try
    {
        const { id } = req.params;

        // 🛡️ Guard: Prevent "undefined" strings or missing IDs from hitting DB
        if (!id || id === 'undefined' || id === 'null')
        {
            return res.status(400).json({ error: "Invalid Order ID" });
        }

        console.log(`Fetching Order: ${id} for Branch: ${req.context.branchId}`);

        const result = await getOrderById(id, req.context.branchId);
        if (!result) return res.status(404).json({ error: "Order not found" });

        res.json(result);
    } catch (e)
    {
        res.status(400).json({ error: e.message });
    }
});

// POST / -> Create Order
router.post("/", requirePermission(PERMISSIONS.ORDER_CREATE), async (req, res) =>
{
    try
    {
        const result = await createOrder({
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

// PATCH /:id/status
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

// --- 3. ITEM ROUTES ---

router.post("/:id/items", requirePermission(PERMISSIONS.ORDER_CREATE), async (req, res) =>
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

router.patch("/items/:itemId/status", requirePermission(PERMISSIONS.ORDER_UPDATE), async (req, res) =>
{
    try
    {
        await changeOrderItemStatus({
            itemId: req.params.itemId,
            newStatus: req.body.newStatus,
            branchId: req.context.branchId,
            actorId: req.context.actorId
        });
        res.json({ ok: true });
    } catch (e)
    {
        res.status(400).json({ error: e.message });
    }
});

router.delete("/items/:itemId", requirePermission(PERMISSIONS.ORDER_UPDATE), async (req, res) =>
{
    try
    {
        await removeOrderItem({
            itemId: req.params.itemId,
            branchId: req.context.branchId,
            actorId: req.context.actorId
        });
        res.status(204).send();
    } catch (e)
    {
        res.status(400).json({ error: e.message });
    }
});

export default router;
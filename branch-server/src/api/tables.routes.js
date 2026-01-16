import express from "express";
import
{
    createTable,
    listTables,
    getTable,
    changeTableStatus, // Use the generic one for cleaner code
    renameTable,
    deleteTable
} from "../tables/tableService.js";
import { assertRequired } from "../utils/validators.js";
import { TABLE_STATUS } from "../tables/tableStates.js";

const router = express.Router();

/* ============================================================
   MIDDLEWARE: Context Extractor
============================================================ */
router.use((req, res, next) =>
{
    const branchId = req.headers['x-branch-id'] || req.query.branchId;
    const actorId = req.headers['x-actor-id'] || req.body.actorId || req.query.actorId;

    if (!branchId)
    {
        return res.status(400).json({ error: "Missing Context: 'x-branch-id' header is required." });
    }
    if (!actorId)
    {
        return res.status(400).json({ error: "Missing Context: 'x-actor-id' header is required." });
    }

    // Attach to request
    req.context = { branchId, actorId };
    next();
});

/* ============================================================
   READ ROUTES
============================================================ */

/**
 * GET /api/tables
 * List all tables for a branch
 */
router.get("/", async (req, res) =>
{
    try
    {
        const { branchId } = req.context;
        const tables = await listTables(branchId);
        res.json(tables);
    } catch (e)
    {
        res.status(500).json({ error: e.message });
    }
});

/**
 * GET /api/tables/:id
 * Get single table details
 */
router.get("/:id", async (req, res) =>
{
    try
    {
        const { branchId } = req.context;
        const table = await getTable(req.params.id, branchId);
        res.json(table);
    } catch (e)
    {
        res.status(404).json({ error: e.message });
    }
});

/* ============================================================
   CREATE ROUTE
============================================================ */

/**
 * POST /api/tables
 * Create a new table
 * [Requires: OWNER or MANAGER]
 */
router.post("/", async (req, res) =>
{
    try
    {
        const { branchId, actorId } = req.context;

        // 1. Validate Input
        assertRequired(req.body, ['label']);

        // 2. Call Service
        const table = await createTable({
            label: req.body.label,
            branchId,
            actorId // Service will check if actor is Manager/Owner
        });

        res.status(201).json(table);

    } catch (e)
    {
        // Handle specific "Access Denied" errors with 403
        const status = e.message.includes("Access Denied") ? 403 : 400;
        res.status(status).json({ error: e.message });
    }
});

/* ============================================================
   UPDATE ROUTES
============================================================ */

/**
 * PATCH /api/tables/:id/status
 * Update table status (Occupied/Free/Reserved)
 * [Allowed: WAITER, CAPTAIN, MANAGER, OWNER]
 */
router.patch("/:id/status", async (req, res) =>
{
    try
    {
        const { branchId, actorId } = req.context;

        // 1. Validate Input
        assertRequired(req.body, ['status']);

        // 2. Call Service (Generic function handles all status types)
        const result = await changeTableStatus({
            tableId: req.params.id,
            branchId,
            actorId,
            newStatus: req.body.status
        });

        res.json(result);

    } catch (e)
    {
        res.status(400).json({ error: e.message });
    }
});

/**
 * PATCH /api/tables/:id
 * Rename a table
 * [Requires: OWNER or MANAGER]
 */
router.patch("/:id", async (req, res) =>
{
    try
    {
        const { branchId, actorId } = req.context;

        // 1. Validate Input
        assertRequired(req.body, ['label']);

        // 2. Call Service
        const result = await renameTable(
            req.params.id,
            branchId,
            req.body.label,
            actorId
        );

        res.json(result);

    } catch (e)
    {
        const status = e.message.includes("Access Denied") ? 403 : 400;
        res.status(status).json({ error: e.message });
    }
});

/* ============================================================
   DELETE ROUTE
============================================================ */

/**
 * DELETE /api/tables/:id
 * Remove a table completely
 * [Requires: OWNER or MANAGER]
 */
router.delete("/:id", async (req, res) =>
{
    try
    {
        const { branchId, actorId } = req.context;

        await deleteTable(req.params.id, branchId, actorId);

        res.status(204).send();

    } catch (e)
    {
        const status = e.message.includes("Access Denied") ? 403 : 400;
        res.status(status).json({ error: e.message });
    }
});

export default router;
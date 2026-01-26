import express from "express";
import
    {
        createTable,
        listTables,
        getTable,
        changeTableStatus,
        renameTable,
        deleteTable
    } from "../tables/tableService.js";
import { assertRequired } from "../utils/validators.js";
import { requireAuth } from "../auth/authMiddleware.js";
import { requirePermission } from "../auth/authorizationService.js";
import { PERMISSIONS } from "../auth/permissions.js";

const router = express.Router();

// 1. Authenticate & Populate Context (user, role, roleId, branchId)
router.use(requireAuth);

/* ============================================================
   READ ROUTES
============================================================ */

/**
 * GET /api/tables
 * List all tables.
 * Permission: TABLE_VIEW
 */
router.get("/", requirePermission(PERMISSIONS.TABLE_VIEW), async (req, res) =>
{
    try
    {
        const { branchId, role } = req.context;

        // Owner sees all (or specific if filtered), Manager locked to branch
        // For listTables, the service usually requires a branchId.
        // If Owner calls without specific query, we might want to return 400 or list all?
        // Usually, the frontend for tables works per-branch.

        const targetBranchId = role === 'OWNER' ? (req.query.branchId || branchId) : branchId;

        if (!targetBranchId && role === 'OWNER')
        {
            // Optional: If Owner doesn't specify branch, maybe return empty or error?
            // For now, let's assume they pick a branch in the UI dropdown.
            return res.status(400).json({ error: "Owner must specify ?branchId=..." });
        }

        const tables = await listTables(targetBranchId);
        res.json(tables);
    } catch (e)
    {
        res.status(500).json({ error: e.message });
    }
});

/**
 * GET /api/tables/:id
 * Get single table details.
 * Permission: TABLE_VIEW
 */
router.get("/:id", requirePermission(PERMISSIONS.TABLE_VIEW), async (req, res) =>
{
    try
    {
        const { branchId, role } = req.context;
        const enforcementBranchId = role === 'OWNER' ? null : branchId;

        const table = await getTable(req.params.id, enforcementBranchId);
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
 * Create a new table.
 * Permission: TABLE_MANAGE
 */
router.post("/", requirePermission(PERMISSIONS.TABLE_MANAGE), async (req, res) =>
{
    try
    {
        const { actorId, role, branchId } = req.context;

        // 1. Validate Input
        assertRequired(req.body, ['label']);

        // 2. Determine Branch
        // Owner can set branchId in body. Manager uses token branchId.
        const targetBranchId = role === 'OWNER' ? req.body.branchId : branchId;

        // 3. Call Service
        const table = await createTable({
            label: req.body.label,
            branchId: targetBranchId,
            actorId
        });

        res.status(201).json(table);

    } catch (e)
    {
        res.status(400).json({ error: e.message });
    }
});

/* ============================================================
   UPDATE ROUTES
============================================================ */

/**
 * PATCH /api/tables/:id/status
 * Update table status (Occupied/Free/Reserved).
 * Permission: TABLE_UPDATE_STATUS
 */
router.patch("/:id/status", requirePermission(PERMISSIONS.TABLE_UPDATE_STATUS), async (req, res) =>
{
    try
    {
        const { branchId, actorId, role } = req.context;

        // 1. Validate Input
        assertRequired(req.body, ['status']);

        const enforcementBranchId = role === 'OWNER' ? null : branchId;

        // 2. Call Service
        const result = await changeTableStatus({
            tableId: req.params.id,
            branchId: enforcementBranchId,
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
 * Rename a table.
 * Permission: TABLE_MANAGE
 */
router.patch("/:id", requirePermission(PERMISSIONS.TABLE_MANAGE), async (req, res) =>
{
    try
    {
        const { branchId, actorId, role } = req.context;

        assertRequired(req.body, ['label']);

        const enforcementBranchId = role === 'OWNER' ? null : branchId;

        const result = await renameTable(
            req.params.id,
            enforcementBranchId,
            req.body.label,
            actorId
        );

        res.json(result);

    } catch (e)
    {
        res.status(400).json({ error: e.message });
    }
});

/* ============================================================
   DELETE ROUTE
============================================================ */

/**
 * DELETE /api/tables/:id
 * Remove a table completely.
 * Permission: TABLE_MANAGE
 */
router.delete("/:id", requirePermission(PERMISSIONS.TABLE_MANAGE), async (req, res) =>
{
    try
    {
        const { branchId, actorId, role } = req.context;
        const enforcementBranchId = role === 'OWNER' ? null : branchId;

        await deleteTable(req.params.id, enforcementBranchId, actorId);

        res.status(204).send();

    } catch (e)
    {
        res.status(400).json({ error: e.message });
    }
});

export default router;
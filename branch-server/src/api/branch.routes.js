import express from "express";
import
    {
        createBranch,
        getBranch,
        listBranches,
        updateBranch
    } from "../infra/branchService.js";
import { assertRequired } from "../utils/validators.js";
import { requireAuth } from "../auth/authMiddleware.js";
import { requirePermission } from "../auth/authorizationService.js";
import { PERMISSIONS } from "../auth/permissions.js";

const router = express.Router();

// 1. Authenticate everyone
router.use(requireAuth);

/* ============================================================
   READ ROUTES (Protected)
============================================================ */

/**
 * GET /api/branches
 * List all branches.
 * Permission: BRANCH_VIEW
 * Note: Ensure all roles (Manager, Waiter, etc.) have this permission 
 * in the database if they need to see branches to switch context.
 */
router.get("/", requirePermission(PERMISSIONS.BRANCH_VIEW), async (req, res) =>
{
    try
    {
        const branches = await listBranches();
        res.json(branches);
    } catch (e)
    {
        res.status(500).json({ error: e.message });
    }
});

/**
 * GET /api/branches/:id
 * Get details of a specific branch.
 * Permission: BRANCH_VIEW
 */
router.get("/:id", requirePermission(PERMISSIONS.BRANCH_VIEW), async (req, res) =>
{
    try
    {
        const branch = await getBranch(req.params.id);
        if (!branch)
        {
            return res.status(404).json({ error: "Branch not found" });
        }
        res.json(branch);
    } catch (e)
    {
        res.status(404).json({ error: e.message });
    }
});

/* ============================================================
   CREATE & UPDATE (Protected)
============================================================ */

/**
 * POST /api/branches
 * Create a new branch.
 * Permission: BRANCH_MANAGE
 */
router.post("/", requirePermission(PERMISSIONS.BRANCH_MANAGE), async (req, res) =>
{
    try
    {
        const { actorId } = req.context;

        // 1. Validate Input
        assertRequired(req.body, ['name', 'address']);

        // 2. Call Service
        const branch = await createBranch({
            name: req.body.name,
            address: req.body.address,
            actorId
        });

        res.status(201).json(branch);

    } catch (e)
    {
        res.status(400).json({ error: e.message });
    }
});

/**
 * PATCH /api/branches/:id
 * Update branch details.
 * Permission: BRANCH_MANAGE
 */
router.patch("/:id", requirePermission(PERMISSIONS.BRANCH_MANAGE), async (req, res) =>
{
    try
    {
        const { actorId } = req.context;

        await updateBranch({
            branchId: req.params.id,
            name: req.body.name,
            address: req.body.address,
            actorId
        });

        res.json({ ok: true });

    } catch (e)
    {
        res.status(400).json({ error: e.message });
    }
});

export default router;
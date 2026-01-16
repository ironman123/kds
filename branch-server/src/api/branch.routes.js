import express from "express";
import
    {
        createBranch,
        getBranch,
        listBranches,
        updateBranch
    } from "../infra/branchService.js"; // Ensure these are async in your service now!
import { assertRequired } from "../utils/validators.js";

const router = express.Router();

/* ============================================================
   HELPER: Actor Extractor
   Branches don't need a "Branch Context" (since they ARE the context),
   but we still need to know WHO is acting (the Admin/Owner).
============================================================ */
const getActor = (req) =>
{
    return req.headers['x-actor-id'] || req.body.actorId || req.query.actorId;
};

/* ============================================================
   READ ROUTES
============================================================ */

/**
 * GET /api/branches
 * List all branches (Admin Dashboard)
 */
router.get("/", async (req, res) =>
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
 * Get details of a specific branch
 */
router.get("/:id", async (req, res) =>
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
   CREATE & UPDATE
============================================================ */

/**
 * POST /api/branches
 * Create a new branch (System Admin / Owner only)
 */
router.post("/", async (req, res) =>
{
    try
    {
        const actorId = getActor(req);

        // 1. Validate Input
        assertRequired(req.body, ['name', 'address']);

        // 2. Call Service
        const branch = await createBranch({
            name: req.body.name,
            address: req.body.address,
            actorId // Pass actor for audit logs
        });

        res.status(201).json(branch);

    } catch (e)
    {
        res.status(400).json({ error: e.message });
    }
});

/**
 * PATCH /api/branches/:id
 * Update branch details
 */
router.patch("/:id", async (req, res) =>
{
    try
    {
        const actorId = getActor(req);

        // We allow partial updates, so we don't assertRequired on everything.
        // But we must check if the service expects specific fields.

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
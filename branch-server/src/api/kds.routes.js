import express from "express";
import { buildKdsView } from "../kds/kdsViewModel.js";
import { requireAuth } from "../auth/authMiddleware.js";

const router = express.Router();

router.use(requireAuth);

/**
 * GET /api/kds/view
 * Polling endpoint for the Kitchen Display Screen
 */
router.get("/view", async (req, res) =>
{
    try
    {
        const view = await buildKdsView(req.context.branchId);
        res.json(view);
    } catch (e)
    {
        console.error("[KDS Error]", e);
        res.status(500).json({ error: "Failed to build KDS view" });
    }
});

export default router;
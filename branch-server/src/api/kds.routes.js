import express from "express";
import { buildKdsView } from "../kds/kdsViewModel.js";

const router = express.Router();

/**
 * GET /api/kds/view
 * Returns the full KDS view model
 * Safe to poll frequently
 */
router.get("/view", (req, res) =>
{
    try
    {
        const view = buildKdsView();
        res.json(view);
    } catch (e)
    {
        console.error("[KDS]", e);
        res.status(500).json({ error: "Failed to build KDS view" });
    }
});

export default router;

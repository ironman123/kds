import express from "express";
import { registerStaff, loginStaff, updatePassword } from "./authService.js";
import { requireAuth } from "./authMiddleware.js";
import db from "../db.js"

const router = express.Router();

/* ============================================================
   PUBLIC ROUTES (No Token Needed)
============================================================ */

// POST /api/auth/register
// ⚠️ In Production: Protect this! Only allow Owners/Managers to call it.
router.post("/register", async (req, res) =>
{
    try
    {
        const result = await registerStaff(req.body);
        res.status(201).json(result);
    } catch (e)
    {
        res.status(400).json({ error: e.message });
    }
});

// GET /api/auth/directory
// Public endpoint for the "Quick Login" screen.
// returns minimal info (Name, Role, Username) - NO sensitive data.
router.get("/directory", async (req, res) =>
{
    try
    {
        // You might want to filter this by a "branchId" query param in the future
        const staffMembers = await db('staff')
            .where({ status: 'ACTIVE' }) // Only show active staff
            .select('id', 'name', 'role', 'username', 'branch_id'); // ⚠️ NO PASSWORDS

        res.json(staffMembers);
    } catch (e)
    {
        res.status(500).json({ error: "Could not fetch directory" });
    }
});

// POST /api/auth/login
// Returns token + requirePasswordChange flag
router.post("/login", async (req, res) =>
{
    try
    {
        const { username, password } = req.body;
        const result = await loginStaff(username, password);
        res.json(result);
    } catch (e)
    {
        // 401 Unauthorized is the standard for failed logins
        res.status(401).json({ error: e.message });
    }
});

/* ============================================================
   PROTECTED ROUTES (Token Required)
============================================================ */

// POST /api/auth/change-password
// The user MUST be logged in (even with a temp password) to call this.
router.post("/change-password", requireAuth, async (req, res) =>
{
    try
    {
        const { newPassword } = req.body;
        const { actorId } = req.context; // Extracted from JWT by middleware

        if (!newPassword || newPassword.length < 6)
        {
            return res.status(400).json({ error: "Password must be at least 6 chars" });
        }

        await updatePassword(actorId, newPassword);

        res.json({ message: "Password updated successfully. Access granted." });
    } catch (e)
    {
        res.status(400).json({ error: e.message });
    }
});

export default router;
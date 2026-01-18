import express from "express";
import
{
    listActiveStaff,
    listAllStaffHistory,
    updateStaffProfile,
    changeStaffStatus,
    changeStaffRole
} from "../staff/staffService.js";
import { assertRequired, assertEnum } from "../utils/validators.js";
import { STAFF_ROLE, assertStaffRole } from "../staff/staffRoles.js";
import { STAFF_STATUS } from "../staff/staffStates.js";

const router = express.Router();

/* ============================================================
   MIDDLEWARE: Context Extractor
   Automatically validates that we know WHICH branch and WHICH user
   is making the request.
============================================================ */
// router.use((req, res, next) =>
// {
//     // 1. Extract Branch ID (Header preferred, query fallback)
//     const branchId = req.headers['x-branch-id'] || req.query.branchId;

//     // 2. Extract Actor ID (In production, this comes from JWT/Auth Middleware)
//     // For now, we trust the client to send it (Dev Mode)
//     const actorId = req.headers['x-actor-id'] || req.body.actorId || req.query.actorId;

//     if (!branchId)
//     {
//         return res.status(400).json({ error: "Missing Context: 'x-branch-id' header is required." });
//     }
//     if (!actorId)
//     {
//         return res.status(400).json({ error: "Missing Context: 'x-actor-id' header is required." });
//     }
//     // Attach to request so routes can use it easily
//     req.context = { branchId, actorId };

//     next();
// });

/* ============================================================
   READ ROUTES
============================================================ */

/**
 * GET /api/staff
 * Lists staff for the current branch.
 * Usage: GET /api/staff?history=true (to see fired staff)
 */
router.get("/", async (req, res) =>
{
    try
    {
        const { branchId, role } = req.context;
        const targetBranchIds = role === 'OWNER' ? null : branchId;
        const showHistory = req.query.history === 'true';

        if (showHistory)
        {
            const history = await listAllStaffHistory(targetBranchIds);
            return res.json(history);
        }

        const activeStaff = await listActiveStaff(targetBranchIds);
        res.json(activeStaff);

    } catch (e)
    {
        res.status(400).json({ error: e.message });
    }
});

/* ============================================================
   CREATE ROUTE (Hiring)
============================================================ */

/**
 * POST /api/staff
 * Hires a new staff member.
 */
router.post("/", async (req, res) =>
{
    try
    {
        await assertStaffRole(actorId, [STAFF_ROLE.OWNER, STAFF_ROLE.MANAGER]);
        const { branchId, actorId } = req.context;

        // 1. Validate Input
        assertRequired(req.body, ['name', 'role', 'phone', 'adhaarNumber']);
        assertEnum(req.body.role, STAFF_ROLE, 'role');

        const cleanName = req.body.name.split(' ')[0].toLowerCase().replace(/[^a-z]/g, '');
        const autoUsername = `${cleanName}.${Math.floor(1000 + Math.random() * 9000)}`;
        const tempPassword = `Welcome@${new Date().getFullYear()}`;

        // 2. Call Service
        const newStaff = await registerStaff({
            branchId,
            actorId,
            name: req.body.name,
            role: req.body.role,
            phone: req.body.phone,
            adhaarNumber: req.body.adhaarNumber,
            // Pass the generated credentials
            username: autoUsername,
            password: tempPassword
        });
        res.status(201).json({
            ...newStaff,
            tempCredentials: {
                username: autoUsername,
                password: tempPassword
            },
            message: "Staff Hired. Please share these credentials immediately."
        });

    } catch (e)
    {
        res.status(400).json({ error: e.message });
    }
});

/* ============================================================
   UPDATE ROUTES
============================================================ */

/**
 * PATCH /api/staff/:id
 * Updates non-sensitive profile details (Name, Phone).
 */
router.patch("/:id", async (req, res) =>
{
    try
    {
        await assertStaffRole(actorId, [STAFF_ROLE.OWNER, STAFF_ROLE.MANAGER]);
        const { branchId, actorId } = req.context;

        // Note: We do NOT allow changing 'role' or 'status' here.
        // Those require specific, secured endpoints below.

        const updatedStaff = await updateStaffProfile({
            staffId: req.params.id,
            branchId,
            actorId,
            updates: {
                name: req.body.name,
                phone: req.body.phone
            }
        });

        res.json(updatedStaff);

    } catch (e)
    {
        res.status(400).json({ error: e.message });
    }
});

/**
 * PATCH /api/staff/:id/status
 * Handles Termination, Re-hiring, or Leave.
 * Body: { status: 'TERMINATED' }
 */
router.patch("/:id/status", async (req, res) =>
{
    try
    {
        await assertStaffRole(actorId, [STAFF_ROLE.OWNER, STAFF_ROLE.MANAGER]);
        const { branchId, actorId } = req.context;

        // 1. Validate Input
        assertRequired(req.body, ['status']);
        assertEnum(req.body.status, STAFF_STATUS, 'status');

        // 2. Call Service
        const result = await changeStaffStatus({
            staffId: req.params.id,
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
 * PATCH /api/staff/:id/role
 * Sensitive Action: Promote/Demote.
 * Only Owners can usually do this.
 * Body: { role: 'MANAGER' }
 */
router.patch("/:id/role", async (req, res) =>
{
    try
    {
        await assertStaffRole(actorId, [STAFF_ROLE.OWNER]);
        const { branchId, actorId } = req.context;

        // 1. Validate Input
        assertRequired(req.body, ['role']);
        assertEnum(req.body.role, STAFF_ROLE, 'role');

        // 2. Call Service
        const result = await changeStaffRole({
            staffId: req.params.id,
            branchId,
            actorId,
            newRole: req.body.role
        });

        res.json(result);

    } catch (e)
    {
        res.status(400).json({ error: e.message });
    }
});

export default router;
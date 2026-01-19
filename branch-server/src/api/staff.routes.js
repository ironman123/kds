import express from "express";
import
{
    createStaff,
    listActiveStaff,
    listAllStaffHistory,
    updateStaffProfile,
    changeStaffStatus,
    changeStaffRole
} from "../staff/staffService.js";
import { assertRequired, assertEnum } from "../utils/validators.js";
import { STAFF_ROLE, assertStaffRole } from "../staff/staffRoles.js";
import { STAFF_STATUS } from "../staff/staffStates.js";
import { requireAuth } from "../auth/authMiddleware.js"; // ✅ USE THIS

const router = express.Router();

/* ============================================================
   READ ROUTES
============================================================ */

/**
 * GET /api/staff
 * Lists staff. 
 * - Owners see ALL (grouped logic handled in UI).
 * - Managers see ONLY their branch.
 */
router.get("/", requireAuth, async (req, res) =>
{
    try
    {
        const { branchId, role } = req.context; // Extracted by requireAuth
        const showHistory = req.query.history === 'true';

        // 🧠 Logic: Owners (null) fetch all. Managers fetch specific branch.
        const targetBranchId = role === STAFF_ROLE.OWNER ? null : branchId;

        if (showHistory)
        {
            const history = await listAllStaffHistory(targetBranchId);
            return res.json(history);
        }

        const activeStaff = await listActiveStaff(targetBranchId);
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
 * Hires a new staff member. Auto-generates credentials.
 */
router.post("/", requireAuth, async (req, res) =>
{
    try
    {
        const { actorId, role: actorRole, branchId: contextBranchId } = req.context;

        // 1. Determine Target Branch
        // Owners can manually set 'branchId' in body. Managers MUST use their token's branch.
        let targetBranchId = contextBranchId;
        if (actorRole === STAFF_ROLE.OWNER && req.body.branchId)
        {
            targetBranchId = req.body.branchId;
        }

        // 2. Validate Input
        assertRequired(req.body, ['name', 'role', 'phone', 'adhaarNumber']);
        assertEnum(req.body.role, STAFF_ROLE, 'role');

        // 3. Call Service (Service generates credentials now!)
        const newStaff = await createStaff({
            branchId: targetBranchId,
            actorId,
            name: req.body.name,
            role: req.body.role,
            phone: req.body.phone,
            adhaarNumber: req.body.adhaarNumber
        });

        // 4. Return result (contains tempCredentials)
        res.status(201).json({
            ...newStaff,
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
router.patch("/:id", requireAuth, async (req, res) =>
{
    try
    {
        const { branchId, actorId, role } = req.context;
        const enforcementBranchId = role === STAFF_ROLE.OWNER ? null : branchId;

        // Validation happens inside service via asserts
        const updatedStaff = await updateStaffProfile({
            staffId: req.params.id,
            branchId: enforcementBranchId,
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
 */
router.patch("/:id/status", requireAuth, async (req, res) =>
{
    try
    {
        const { branchId, actorId, role } = req.context;

        assertRequired(req.body, ['status']);
        assertEnum(req.body.status, STAFF_STATUS, 'status');
        const enforcementBranchId = role === STAFF_ROLE.OWNER ? null : branchId;

        const result = await changeStaffStatus({
            staffId: req.params.id,
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
 * PATCH /api/staff/:id/role
 * Sensitive Action: Promote/Demote.
 */
router.patch("/:id/role", requireAuth, async (req, res) =>
{
    try
    {
        const { branchId, actorId, role } = req.context;

        assertRequired(req.body, ['role']);
        assertEnum(req.body.role, STAFF_ROLE, 'role');
        const enforcementBranchId = role === STAFF_ROLE.OWNER ? null : branchId;

        const result = await changeStaffRole({
            staffId: req.params.id,
            branchId: enforcementBranchId,
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
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
import { STAFF_ROLE } from "../staff/staffRoles.js";
import { STAFF_STATUS } from "../staff/staffStates.js";
import { requireAuth } from "../auth/authMiddleware.js";
import { requirePermission } from "../auth/authorizationService.js";
import { PERMISSIONS } from "../auth/permissions.js";

const router = express.Router();

// 1. Authenticate everyone
router.use(requireAuth);

/* ============================================================
   READ ROUTES
============================================================ */

/**
 * GET /api/staff
 * Lists staff.
 * Permission: STAFF_MANAGE (Owners & Managers)
 */
router.get("/", requirePermission(PERMISSIONS.STAFF_MANAGE), async (req, res) =>
{
    try
    {
        const { branchId, role } = req.context;
        const showHistory = req.query.history === 'true';

        // 🧠 Scoping Logic: 
        // If Owner (role string check), they can see all (null). 
        // Managers are locked to their context branchId.
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
 * Hires a new staff member.
 * Permission: STAFF_MANAGE
 */
router.post("/", requirePermission(PERMISSIONS.STAFF_MANAGE), async (req, res) =>
{
    try
    {
        const { actorId, role: actorRole, branchId: contextBranchId } = req.context;

        // 1. Determine Target Branch
        // Owners can manually set 'branchId' in body. Managers MUST use their token's branch.
        let targetBranchId = contextBranchId;
        if (actorRole === STAFF_ROLE.OWNER)
        {
            targetBranchId = req.body.branchId || contextBranchId; // Fallback to context if set, or null
            if (!targetBranchId && req.body.role !== 'MANAGER')
            {
                // Optional: Enforce branch selection for non-manager roles if desired, 
                // but for now we trust the service to validate if needed.
            }
        }

        // 2. Validate Input
        assertRequired(req.body, ['name', 'role', 'phone', 'adhaarNumber']);
        assertEnum(req.body.role, STAFF_ROLE, 'role');

        // 3. Call Service 
        // (Note: Service should use authService.registerStaff to ensure role_id is set correctly)
        const newStaff = await createStaff({
            branchId: targetBranchId,
            actorId,
            name: req.body.name,
            role: req.body.role, // String role (e.g. 'WAITER')
            phone: req.body.phone,
            adhaarNumber: req.body.adhaarNumber
        });

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
 * Updates non-sensitive profile details.
 * Permission: STAFF_MANAGE
 */
router.patch("/:id", requirePermission(PERMISSIONS.STAFF_MANAGE), async (req, res) =>
{
    try
    {
        const { branchId, actorId, role } = req.context;
        const enforcementBranchId = role === STAFF_ROLE.OWNER ? null : branchId;

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
 * Permission: STAFF_MANAGE
 */
router.patch("/:id/status", requirePermission(PERMISSIONS.STAFF_MANAGE), async (req, res) =>
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
 * Permission: STAFF_MANAGE
 */
router.patch("/:id/role", requirePermission(PERMISSIONS.STAFF_MANAGE), async (req, res) =>
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
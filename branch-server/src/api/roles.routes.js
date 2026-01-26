import express from "express";
import
{
    createRole,
    getAllRoles,
    getAllPermissions,
    updateRole,
    deleteRole
} from "../role/roleService.js"; // Importing from local service
import { requireAuth } from "../auth/authMiddleware.js";
import { requirePermission } from "../auth/authorizationService.js";
import { PERMISSIONS } from "../auth/permissions.js";

const router = express.Router();

router.use(requireAuth);

/* ============================================================
   ROLES (Owner/HR Only)
============================================================ */

/**
 * GET /api/roles
 * List roles relevant to the user's branch (or all if Owner)
 * Permission: STAFF_MANAGE
 */
router.get("/", requirePermission(PERMISSIONS.STAFF_MANAGE), async (req, res) =>
{
    try
    {
        const { branchId, role } = req.context;
        // If Owner: Fetch ALL (null). If Manager: Fetch Global + My Branch Specific
        const targetBranchId = role === 'OWNER' ? null : branchId;

        const result = await getAllRoles(targetBranchId);
        res.json(result);
    } catch (e)
    {
        res.status(500).json({ error: e.message });
    }
});

/**
 * POST /api/roles
 * Create a new Custom Role
 * Permission: STAFF_MANAGE
 */
router.post("/", requirePermission(PERMISSIONS.STAFF_MANAGE), async (req, res) =>
{
    try
    {
        const { name, permissions, description } = req.body;
        const { branchId, role, actorId } = req.context;

        // Owner creates Global (null) or Specific. Manager creates Branch Specific.
        const targetBranchId = role === 'OWNER' ? (req.body.branchId || null) : branchId;

        const result = await createRole({
            name,
            description,
            permissions,
            branchId: targetBranchId,
            actorId
        });

        res.status(201).json(result);
    } catch (e)
    {
        res.status(400).json({ error: e.message });
    }
});

/**
 * PUT /api/roles/:id
 * Update Role (Name, Description, Permissions)
 * Permission: STAFF_MANAGE
 */
router.put("/:id", requirePermission(PERMISSIONS.STAFF_MANAGE), async (req, res) =>
{
    try
    {
        const { name, description, permissions } = req.body;
        const { actorId } = req.context;

        const result = await updateRole({
            roleId: req.params.id,
            name,
            description,
            permissions,
            actorId
        });

        res.json(result);
    } catch (e)
    {
        res.status(400).json({ error: e.message });
    }
});

/**
 * DELETE /api/roles/:id
 * Soft Delete a Role
 * Permission: STAFF_MANAGE
 */
router.delete("/:id", requirePermission(PERMISSIONS.STAFF_MANAGE), async (req, res) =>
{
    try
    {
        const result = await deleteRole(req.params.id);
        res.json(result);
    } catch (e)
    {
        res.status(400).json({ error: e.message });
    }
});

/* ============================================================
   PERMISSIONS LIST
============================================================ */

/**
 * GET /api/roles/permissions
 * List all available permissions (For the UI checkboxes)
 * Permission: STAFF_MANAGE
 */
router.get("/permissions/list", requirePermission(PERMISSIONS.STAFF_MANAGE), async (req, res) =>
{
    try
    {
        const perms = await getAllPermissions();
        res.json(perms);
    } catch (e)
    {
        res.status(500).json({ error: e.message });
    }
});

export default router;
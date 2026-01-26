import db from '../db.js';

// Simple in-memory cache to prevent hitting DB on every request.
// In production, use Redis or a library like 'node-cache'.
const permissionCache = new Map(); // Key: roleId, Value: Set<permission_id>

/**
 * Helper: Loads permissions for a specific role from DB
 */
async function getPermissionsForRole(roleId)
{
    if (!roleId) return new Set();

    // 1. Return cached if available
    if (permissionCache.has(roleId))
    {
        return permissionCache.get(roleId);
    }

    // 2. Fetch from DB
    const rows = await db('role_permissions')
        .where({ role_id: roleId })
        .select('permission_id');

    // 3. Store in Cache
    const perms = new Set(rows.map(r => r.permission_id));
    permissionCache.set(roleId, perms);

    // Optional: Clear cache every 5 minutes to allow updates to propagate
    setTimeout(() => permissionCache.delete(roleId), 5 * 60 * 1000);

    return perms;
}

/**
 * THE CORE CHECK FUNCTION
 * Returns true/false
 */
export async function can(user, requiredPermission)
{
    // 1. GOD MODE: Owners bypass all checks
    if (user.role === 'OWNER') return true;
    console.log(user);

    // 2. Fail safe: If no role assigned
    if (!user.roleId) return false;

    // 3. Check Role Permissions
    const permissions = await getPermissionsForRole(user.roleId);
    console.log(permissions);
    console.log(requirePermission);
    return permissions.has(requiredPermission);
}

/**
 * EXPRESS MIDDLEWARE
 * Usage: router.post('/', requirePermission(PERMISSIONS.MENU_CREATE), controller)
 */
export const requirePermission = (permission) =>
{
    return async (req, res, next) =>
    {
        try
        {
            // Assumes authMiddleware has already populated req.context
            const user = req.context;

            if (!user)
            {
                return res.status(401).json({ error: "Unauthorized" });
            }
            const allowed = await can(user, permission);

            if (!allowed)
            {
                return res.status(403).json({
                    error: "Access Denied",
                    message: `Missing permission: ${permission}`
                });
            }

            next();
        } catch (err)
        {
            console.error("AuthZ Error:", err);
            res.status(500).json({ error: "Authorization failed" });
        }
    };
};

// Helper to clear cache when Owner updates a Role
export function invalidateRoleCache(roleId)
{
    permissionCache.delete(roleId);
}
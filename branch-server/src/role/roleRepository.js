import db from "../db.js";

/* ============================================================
   READ
============================================================ */

// Fetch a single role with its permissions
export async function getRoleById(roleId)
{
    const role = await db('roles')
        .where({ id: roleId })
        .whereNull('deleted_at')
        .first();

    if (!role) return null;

    // Fetch associated permissions
    const perms = await db('role_permissions')
        .where({ role_id: roleId })
        .select('permission_id');

    return {
        ...role,
        permissions: perms.map(p => p.permission_id)
    };
}

export async function getRoleByName(name, branchId)
{
    const query = db('roles')
        .whereRaw('LOWER(name) = ?', [name.toLowerCase()])
        .whereNull('deleted_at');

    if (branchId)
    {
        query.andWhere('branch_id', branchId);
    } else
    {
        query.whereNull('branch_id'); // Global Check
    }

    return query.first();
}

export async function listRolesRepo(branchId)
{
    // 1. Fetch Roles
    const query = db('roles').whereNull('deleted_at');

    if (branchId)
    {
        // If specific branch: Get Global Roles + Branch Specific Roles
        query.andWhere(q =>
        {
            q.whereNull('branch_id').orWhere('branch_id', branchId);
        });
    } else
    {
        // If Owner (null branchId): Get EVERYTHING
    }

    const roles = await query;

    // 2. Fetch Permissions for these roles (Optimization: Batch fetch)
    const roleIds = roles.map(r => r.id);
    const allPerms = await db('role_permissions')
        .whereIn('role_id', roleIds)
        .select('role_id', 'permission_id');

    // 3. Map Permissions to Roles
    const permMap = {};
    allPerms.forEach(p =>
    {
        if (!permMap[p.role_id]) permMap[p.role_id] = [];
        permMap[p.role_id].push(p.permission_id);
    });

    return roles.map(r => ({
        ...r,
        permissions: permMap[r.id] || []
    }));
}

export async function listAllPermissionsRepo()
{
    return db('permissions').select('*');
}

/* ============================================================
   WRITE
============================================================ */

export async function insertRole(roleData)
{
    await db('roles').insert({
        id: roleData.id,
        name: roleData.name,
        description: roleData.description,
        branch_id: roleData.branchId || null,
        is_system_role: false,
        created_at: Date.now(),
        updated_at: Date.now(),
        deleted_at: null
    });
}

// Handles the Many-to-Many Sync (Wipe old -> Insert new)
export async function syncRolePermissions(roleId, permissionIds, trx = db)
{
    // 1. Delete existing
    await trx('role_permissions').where({ role_id: roleId }).del();

    // 2. Insert new
    if (permissionIds && permissionIds.length > 0)
    {
        const inserts = permissionIds.map(p => ({
            role_id: roleId,
            permission_id: p
        }));
        await trx('role_permissions').insert(inserts);
    }
}

export async function updateRoleDetails(roleId, updates)
{
    await db('roles')
        .where({ id: roleId })
        .update({
            ...updates,
            updated_at: Date.now()
        });
}

// Soft Delete
export async function softDeleteRole(roleId)
{
    await db('roles')
        .where({ id: roleId })
        .update({
            deleted_at: Date.now(),
            updated_at: Date.now()
        });
}
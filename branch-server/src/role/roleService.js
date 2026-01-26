import crypto from "crypto";
import db from "../db.js";
import
    {
        getRoleById,
        getRoleByName,
        insertRole,
        listRolesRepo,
        syncRolePermissions,
        softDeleteRole,
        listAllPermissionsRepo,
        updateRoleDetails
    } from "./roleRepository.js";
import { invalidateRoleCache } from "../auth/authorizationService.js";

/* ============================================================
   READ
============================================================ */
export async function getAllRoles(branchId)
{
    return listRolesRepo(branchId);
}

export async function getRole(roleId)
{
    const role = await getRoleById(roleId);
    if (!role) throw new Error("Role not found");
    return role;
}

export async function getAllPermissions()
{
    return listAllPermissionsRepo();
}

/* ============================================================
   WRITE
============================================================ */
export async function createRole({ name, description, permissions, branchId, actorId })
{
    // 1. Duplicate Check
    const existing = await getRoleByName(name, branchId);
    if (existing)
    {
        throw new Error(`Role '${name}' already exists in this context.`);
    }

    const roleId = crypto.randomUUID();

    // 2. Transaction: Create Role + Assign Permissions
    await db.transaction(async (trx) =>
    {
        // Insert Role
        await insertRole({
            id: roleId,
            name,
            description,
            branchId
        });

        // Insert Permissions
        if (permissions && permissions.length > 0)
        {
            await syncRolePermissions(roleId, permissions, trx);
        }
    });

    return { id: roleId, message: "Role created successfully" };
}

export async function updateRole({ roleId, name, description, permissions, branchId, actorId })
{
    const role = await getRoleById(roleId);
    if (!role) throw new Error("Role not found");

    // Protection: Prevent modifying System Roles (like OWNER/MANAGER)
    if (role.is_system_role)
    {
        // Optional: Allow updating description/permissions but NOT name
        if (name && name !== role.name)
        {
            throw new Error("Cannot rename a System Role.");
        }
    }

    await db.transaction(async (trx) =>
    {
        // 1. Update Details
        await updateRoleDetails(roleId, { name, description });

        // 2. Update Permissions
        if (permissions)
        {
            await syncRolePermissions(roleId, permissions, trx);
        }
    });

    // 3. Clear Cache (CRITICAL)
    invalidateRoleCache(roleId);

    return { ok: true, message: "Role updated" };
}

export async function deleteRole(roleId)
{
    const role = await getRoleById(roleId);
    if (!role) throw new Error("Role not found");

    if (role.is_system_role)
    {
        throw new Error("Cannot delete a System Role (Manager, Waiter, etc.)");
    }

    await softDeleteRole(roleId);

    // Clear Cache
    invalidateRoleCache(roleId);

    return { ok: true, message: "Role deleted" };
}
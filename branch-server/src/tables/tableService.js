// src/tables/tableService.js
import crypto from "crypto";
import
{
    insertTable,
    getTableById,
    getTableByName,
    updateTableStatus,
    listTablesForBranch,
    getFreeTables as repoGetFreeTables,
    getActiveTables as repoGetActiveTables,
    updateTableLabel,
    deleteTableById
} from "./tableRepository.js";
import { TABLE_STATUS, ALLOWED_TABLE_TRANSITIONS } from "./tableStates.js";
import { assertBranchExists } from "../infra/branchService.js";
import { STAFF_ROLE, assertStaffRole } from "../staff/staffRoles.js";

/* ============================================================
   PRIVATE HELPER
============================================================ */
async function getTableOrThrow(tableId, branchId)
{
    const table = await getTableById(tableId, branchId);
    if (!table)
    {
        throw new Error("Table not found in this branch");
    }
    return table;
}

export async function assertTableFree(tableId, branchId) 
{
    const table = await getTableById(tableId, branchId);

    if (!table) 
    {
        throw new Error("Table not found");
    }

    if (table.status !== TABLE_STATUS.FREE) 
    {
        throw new Error(`Table is currently ${table.status}. Please clear it first.`);
    }

    return true;
}

/* ============================================================
   READ & CREATE (Layout Management)
============================================================ */

export async function createTable({ label, branchId, actorId })
{
    if (!branchId) throw new Error("Branch ID is required");
    await assertBranchExists(branchId);
    const tableExists = await getTableByName(label, branchId);
    if (tableExists)
    {
        throw new Error(`Table '${label}' already exists.`);
    }
    // SECURITY: Only Owners/Managers can change the floor layout
    await assertStaffRole(actorId, [STAFF_ROLE.OWNER, STAFF_ROLE.MANAGER]);

    const now = Date.now();
    const table = {
        id: crypto.randomUUID(),
        label,
        status: TABLE_STATUS.FREE,
        createdAt: now,
        updatedAt: now,
        branchId,
    };

    await insertTable(table);
    return table;
}

export async function listTables(branchId)
{
    if (!branchId) throw new Error("Branch ID is required");
    return listTablesForBranch(branchId);
}

export async function getFreeTables(branchId)
{
    if (!branchId) throw new Error("Branch ID is required");
    return repoGetFreeTables(branchId);
}

export async function getActiveTables(branchId)
{
    if (!branchId) throw new Error("Branch ID is required");
    return repoGetActiveTables(branchId);
}

export async function getTable(tableId, branchId)
{
    return getTableOrThrow(tableId, branchId);
}

/* ============================================================
   STATE MACHINE (Operations)
============================================================ */

export async function changeTableStatus({ tableId, branchId, newStatus, actorId })
{
    const table = await getTableOrThrow(tableId, branchId);

    // Optimization
    if (table.status === newStatus) return table;

    // 1. SECURITY: Waiters/Captains/Kitchen can update status
    // (Everyone needs to know if a table is free or dirty)
    await assertStaffRole(actorId, [
        STAFF_ROLE.OWNER, STAFF_ROLE.MANAGER,
        STAFF_ROLE.CAPTAIN, STAFF_ROLE.WAITER
    ]);

    // 2. Validate Transition
    const validMoves = ALLOWED_TABLE_TRANSITIONS[table.status];
    if (!validMoves || !validMoves.includes(newStatus))
    {
        throw new Error(`Invalid table transition: Cannot go from '${table.status}' to '${newStatus}'`);
    }

    // 3. Update Database
    await updateTableStatus(tableId, newStatus, branchId);

    return { ...table, status: newStatus, updatedAt: Date.now() };
}

/* ============================================================
   WRAPPERS (For convenience)
============================================================ */

export async function markTableOccupied(tableId, branchId, actorId)
{
    return changeTableStatus({
        tableId, branchId, actorId,
        newStatus: TABLE_STATUS.OCCUPIED
    });
}

export async function markTableFree(tableId, branchId, actorId)
{
    return changeTableStatus({
        tableId, branchId, actorId,
        newStatus: TABLE_STATUS.FREE
    });
}

export async function markTableReserved(tableId, branchId, actorId)
{
    return changeTableStatus({
        tableId, branchId, actorId,
        newStatus: TABLE_STATUS.RESERVED
    });
}

/* ============================================================
   ADMIN ACTIONS (Layout Updates)
============================================================ */

// Renamed from 'updateTableDetails' to be more specific, 
// but exported as alias if needed.
export async function renameTable(tableId, branchId, newLabel, actorId)
{
    const table = await getTableOrThrow(tableId, branchId);

    // SECURITY: Layout changes = Manager/Owner only
    await assertStaffRole(actorId, [STAFF_ROLE.OWNER, STAFF_ROLE.MANAGER]);

    await updateTableLabel(tableId, newLabel, branchId);
    return { ...table, label: newLabel };
}

// Alias for consistency with Route expectations
export async function deleteTable(tableId, branchId, actorId)
{
    const table = await getTableOrThrow(tableId, branchId);

    // SECURITY: Layout changes = Manager/Owner only
    await assertStaffRole(actorId, [STAFF_ROLE.OWNER, STAFF_ROLE.MANAGER]);

    if (table.status !== TABLE_STATUS.FREE)
    {
        throw new Error("Cannot delete a table while it is in use (Occupied/Reserved)");
    }

    await deleteTableById(tableId, branchId);
    return { ok: true };
}
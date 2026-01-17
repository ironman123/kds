// src/staff/staffRepository.js
import db from "../db.js";

// --- CREATE ---
export async function insertStaff(staffData)
{
    await db('staff').insert({
        id: staffData.id,
        branch_id: staffData.branchId,
        name: staffData.name,
        role: staffData.role,
        phone: staffData.phone,
        adhaar_number: staffData.adhaarNumber,
        status: staffData.status,
        created_at: staffData.createdAt,
        updated_at: staffData.createdAt, // ✅ SYNC: Initialize updated_at
        active: 1,
        deleted_at: null // ✅ SYNC: Explicitly alive
    });
}

// --- READ ---
export async function getStaffById(staffId, branchId)
{
    const row = await db('staff')
        .where({ id: staffId, branch_id: branchId })
        .whereNull('deleted_at') // 🛡️ Hide deleted staff
        .first();

    if (!row) return null;
    return mapRowToStaff(row);
}

export async function getStaffByPhone(phone)
{
    // Note: Phone lookups (e.g. login) should definitely ignore deleted users
    const row = await db('staff')
        .where({ phone })
        .whereNull('deleted_at')
        .first();

    return row ? mapRowToStaff(row) : null;
}

export async function listStaffForBranch(branchId, includeTerminated = false)
{
    const query = db('staff')
        .where({ branch_id: branchId })
        .whereNull('deleted_at') // 🛡️ Always hide "Hard" deleted (mistakes)
        .orderBy('name', 'asc');

    // "Terminated" is different from "Deleted". 
    // Terminated = Fired (Record exists). Deleted = Mistake (Record hidden).
    if (!includeTerminated)
    {
        query.whereNot({ status: 'TERMINATED' });
    }

    const rows = await query;
    return rows.map(mapRowToStaff);
}

export async function getStaffByIdGlobal(id)
{
    const row = await db('staff')
        .where({ id })
        .whereNull('deleted_at')
        .first();

    return row ? mapRowToStaff(row) : null;
}

// --- UPDATE ---

// 1. UPDATE PROFILE
export async function updateStaffDetails(staffId, branchId, updates)
{
    await db('staff')
        .where({ id: staffId, branch_id: branchId })
        .whereNull('deleted_at') // Safety
        .update({
            name: updates.name,
            phone: updates.phone,
            updated_at: Date.now() // ✅ SYNC: Mark as changed
        });
}

// 2. UPDATE STATUS (Business Logic: Fired/Resigned)
export async function updateStaffStatus(staffId, branchId, newStatus)
{
    const updateData = {
        status: newStatus,
        updated_at: Date.now() // ✅ SYNC: Mark as changed
    };

    if (newStatus === 'TERMINATED')
    {
        // Use Date.now() for consistency with your schema's integer timestamps
        updateData.terminated_at = Date.now();
    } else
    {
        updateData.terminated_at = null;
    }

    await db('staff')
        .where({ id: staffId, branch_id: branchId })
        .whereNull('deleted_at')
        .update(updateData);
}

// 3. UPDATE ROLE (High Security)
export async function updateStaffRole(staffId, branchId, newRole)
{
    await db('staff')
        .where({ id: staffId, branch_id: branchId })
        .whereNull('deleted_at')
        .update({
            role: newRole,
            updated_at: Date.now() // ✅ SYNC
        });
}

// 4. DELETE (Soft Delete for Mistakes)
// Use this if you created a staff member by accident and want to remove them entirely
export async function deleteStaff(staffId, branchId)
{
    await db('staff')
        .where({ id: staffId, branch_id: branchId })
        .update({
            deleted_at: Date.now(), // ✅ SYNC: Soft Delete
            updated_at: Date.now()  // Mark updated so cloud picks up the deletion
        });
}

// --- HELPER ---
function mapRowToStaff(row)
{
    return {
        id: row.id,
        branchId: row.branch_id,
        name: row.name,
        role: row.role,
        phone: row.phone,
        adhaarNumber: row.adhaar_number,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        terminatedAt: row.terminated_at, // Use standard camelCase
        deletedAt: row.deleted_at
    };
}
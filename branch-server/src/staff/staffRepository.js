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
        active: 1 // Legacy support if needed, otherwise ignore
    });
}

// --- READ ---
export async function getStaffById(staffId, branchId)
{
    const row = await db('staff')
        .where({ id: staffId, branch_id: branchId })
        .first();

    if (!row) return null;
    return mapRowToStaff(row);
}

export async function getStaffByPhone(phone)
{
    const row = await db('staff').where({ phone }).first();
    return row ? mapRowToStaff(row) : null;
}

export async function listStaffForBranch(branchId, includeTerminated = false)
{
    const query = db('staff')
        .where({ branch_id: branchId })
        .orderBy('name', 'asc');

    // By default, we hide people who left (Soft Delete logic)
    if (!includeTerminated)
    {
        query.whereNot({ status: 'TERMINATED' });
    }

    const rows = await query;
    return rows.map(mapRowToStaff);
}

// --- UPDATE ---
// src/staff/staffRepository.js

// 1. UPDATE PROFILE (Safe fields only)
export async function updateStaffDetails(staffId, branchId, updates)
{
    await db('staff')
        .where({ id: staffId, branch_id: branchId })
        .update({
            name: updates.name,
            phone: updates.phone,
            // REMOVED 'role'. Use updateStaffRole for that!
            // REMOVED 'adhaar'. Sensitive data shouldn't be easy to change.
        });
}

// 2. UPDATE STATUS (Handles Side Effects)
export async function updateStaffStatus(staffId, branchId, newStatus)
{
    const updateData = { status: newStatus };

    // logic stays encapsulated here (or in service)
    if (newStatus === 'TERMINATED')
    {
        updateData.terminated_at = db.fn.now();
    } else
    {
        updateData.terminated_at = null;
    }

    await db('staff')
        .where({ id: staffId, branch_id: branchId })
        .update(updateData);
}

// 3. UPDATE ROLE (High Security)
export async function updateStaffRole(staffId, branchId, newRole)
{
    await db('staff')
        .where({ id: staffId, branch_id: branchId })
        .update({ role: newRole });
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
        terminatedAt: row.terminated_at
    };
}

export async function getStaffByIdGlobal(id)
{
    const row = await db('staff').where({ id }).first();
    return row ? mapRowToStaff(row) : null;
}
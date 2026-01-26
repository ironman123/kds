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

        // 🚨 ADD THESE MISSING AUTH FIELDS
        username: staffData.username,
        password_hash: staffData.passwordHash,
        must_change_password: staffData.mustChangePassword,

        status: staffData.status,
        created_at: staffData.createdAt,
        updated_at: staffData.createdAt,
        active: 1,
        deleted_at: null
    });
}

// --- READ ---
export async function getStaffById(staffId, branchId)
{
    const query = await db('staff')
        .where({ id: staffId })
        .whereNull('deleted_at') // 🛡️ Hide deleted staff
        .first();

    if (branchId)
    {
        query.where({ branch_Id: branchId });
    }

    const row = await query;
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
        .leftJoin('branch', 'staff.branch_id', 'branch.id')
        .select(
            'staff.*',
            'branch.name as branch_name'
        )
        .whereNull('staff.deleted_at')
        .orderBy('branch.name', 'asc')
        .orderBy('staff.name', 'asc')

    if (branchId)
    {
        if (Array.isArray(branchId))
        {
            // Case A: Owner filters specific branches ['b1', 'b2']
            query.whereIn('staff.branch_id', branchId);
        } else
        {
            // Case B: Manager sees their one branch 'b1'
            query.where('staff.branch_id', branchId);
        }
    }

    // "Terminated" is different from "Deleted". 
    // Terminated = Fired (Record exists). Deleted = Mistake (Record hidden).
    if (!includeTerminated)
    {
        query.whereNot('staff.status', 'TERMINATED');
    }

    const rows = await query;
    return rows.map(row => ({
        ...mapRowToStaff(row),
        branchName: row.branch_name || 'Unknown Branch' // 👈 Add to object
    }));
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
    const query = db('staff')
        .where({ id: staffId })
        .whereNull('deleted_at'); // Safety

    if (branchId)
    {
        query.where({ branch_id: branchId });
    }
    await query.update({
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
        updateData.active = 0;
    } else
    {
        updateData.terminated_at = null;
    }

    const query = db('staff')
        .where({ id: staffId })
        .whereNull('deleted_at');

    if (branchId)
    {
        query.where({ branch_id: branchId });
    }

    const rowsAffected = await query.update(updateData);

    if (rowsAffected === 0)
    {
        // If 0 rows changed, it means the ID didn't exist OR the Owner/Manager 
        // didn't have permission for this specific row.
        throw new Error(`Termination failed: Staff member not found or access denied.`);
    }

    return rowsAffected;
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
    const query = db('staff')
        .where({ id: staffId });

    // 🧠 FIX: Only enforce branch check if branchId is NOT null
    if (branchId)
    {
        query.where({ branch_id: branchId });
    }

    await query.update({
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
        roleId: row.role_id,
        phone: row.phone,
        username: row.username,
        adhaarNumber: row.adhaar_number,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        terminatedAt: row.terminated_at, // Use standard camelCase
        deletedAt: row.deleted_at
    };
}
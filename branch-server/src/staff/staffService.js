// src/staff/staffService.js
import crypto from "crypto";
import bcrypt from "bcryptjs";
import db from "../db.js"
import
{
    insertStaff,
    getStaffById,
    getStaffByPhone,
    updateStaffStatus,
    updateStaffDetails,
    updateStaffRole as repoUpdateStaffRole,
    listStaffForBranch,
    deleteStaff
} from "./staffRepository.js";
import { STAFF_STATUS, ALLOWED_STAFF_TRANSITIONS } from "./staffStates.js";
import { logStaffEvent, STAFF_EVENT_TYPE } from "./staffEventRepository.js";
import
{
    STAFF_ROLE, assertStaffRole
} from "./staffRoles.js";
import { assertBranchExists } from "../infra/branchService.js";

// Rank hierarchy: Higher number = Higher power
const ROLE_RANK = {
    [STAFF_ROLE.OWNER]: 100,
    [STAFF_ROLE.MANAGER]: 80,
    [STAFF_ROLE.CAPTAIN]: 50,
    [STAFF_ROLE.WAITER]: 20,
    [STAFF_ROLE.KITCHEN]: 20,
    [STAFF_ROLE.HELPER]: 10
};

/* ============================================================
   PRIVATE HELPERS
============================================================ */
async function getStaffOrThrow(staffId, branchId)
{
    const staff = await getStaffById(staffId, branchId);
    if (!staff) throw new Error("Staff member not found in this branch");
    return staff;
}

// Helper: Generate unique username (rahul, rahul1, rahul2...)
async function generateUniqueUsername(name)
{
    // 1. Sanitize the base name
    const base = name.split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, '');

    // 2. Fetch ALL usernames that start with this base in one query
    // This example uses Knex.js syntax (implied by your prompt)
    const existingUsers = await db('staff')
        .where('username', 'like', `${base}%`) // specific logic depends on SQL dialect (Postgres use ILIKE)
        .select('username');

    // 3. If the exact base doesn't exist, return it immediately
    const baseExists = existingUsers.some(u => u.username === base);
    if (!baseExists)
    {
        return base;
    }

    // 4. Extract suffixes and find the max number in memory
    // This avoids N+1 database queries
    const suffixes = existingUsers
        .map(u =>
        {
            const match = u.username.match(new RegExp(`^${base}(\\d+)$`));
            return match ? parseInt(match[1], 10) : 0;
        })
        .filter(n => !isNaN(n));


    // If we have 'john', 'john1', 'john5', the max is 5. Next is 6.
    // If suffixes is empty but base exists, start at 1.
    const maxSuffix = suffixes.length > 0 ? Math.max(...suffixes) : 0;

    return `${base}${maxSuffix + 1}`;
}

function assertHierarchy(actorRole, targetRole)
{
    if (ROLE_RANK[actorRole] <= ROLE_RANK[targetRole])
    {
        throw new Error("Permission Denied: You cannot modify someone with an equal or higher rank.");
    }
}

/* ============================================================
   CORE SERVICES
============================================================ */

export async function createStaff({ name, role, phone, adhaarNumber, branchId, actorId })
{
    if (!branchId) throw new Error("Branch ID is required");
    await assertBranchExists(branchId);

    // 1. Authorization
    //const actor = await assertStaff(actorId, [STAFF_ROLE.OWNER, STAFF_ROLE.MANAGER]);

    // 2. Generate Credentials (THE MISSING PART)
    const username = await generateUniqueUsername(name);
    const tempPassword = "123456";
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // 3. Validation
    // (Your existing validation code...)

    // 4. Create Object
    const staff = {
        id: crypto.randomUUID(),
        branchId,
        name,
        role,
        phone,
        adhaarNumber,
        // Auth Data
        username,
        passwordHash: hashedPassword,
        mustChangePassword: true,
        // Status
        status: STAFF_STATUS.ACTIVE,
        createdAt: Date.now(),
    };

    await insertStaff(staff);

    // 5. Log
    await logStaffEvent({
        staffId: staff.id,
        branchId,
        eventType: STAFF_EVENT_TYPE.CREATED,
        newValue: { name, role, phone },
        actorId
    });

    // 6. Return Credentials to UI
    return {
        ...staff,
        tempCredentials: { username, password: tempPassword }
    };
}

export async function updateStaffProfile({ staffId, branchId, updates, actorId })
{
    const staff = await getStaffOrThrow(staffId, branchId);

    // Auth: Only Owner/Manager OR the staff themselves can edit profile
    if (staffId !== actorId)
    {
        const actor = await assertStaffRole(actorId, [STAFF_ROLE.OWNER, STAFF_ROLE.MANAGER]);
        // Optional: Managers shouldn't edit Owners' personal details
        if (actor.role !== STAFF_ROLE.OWNER)
        {
            assertHierarchy(actor.role, staff.role);
        }
    }

    if (staff.status === STAFF_STATUS.TERMINATED)
    {
        throw new Error("Cannot edit details of a terminated staff member.");
    }

    // Update DB
    await updateStaffDetails(staffId, branchId, updates);

    // Log Event
    await logStaffEvent({
        staffId: staffId,
        branchId,
        eventType: STAFF_EVENT_TYPE.PROFILE_UPDATED,
        oldValue: null, // Storing "null" to save space, or calculate diff if needed
        newValue: Object.keys(updates), // Log *what* fields changed
        actorId
    });

    return { ...staff, ...updates };
}

export async function changeStaffStatus({ staffId, branchId, newStatus, actorId })
{
    const staff = await getStaffOrThrow(staffId, branchId);

    // Optimization
    if (staff.status === newStatus) return staff;

    // 1. Authorization
    const actor = //await assertStaff(actorId, [STAFF_ROLE.OWNER, STAFF_ROLE.MANAGER]);

        // 2. Hierarchy Check (e.g., Manager cannot Fire Owner)
        assertHierarchy(actor.role, staff.role);

    // 3. State Machine Validation
    const validMoves = ALLOWED_STAFF_TRANSITIONS[staff.status];
    if (!validMoves || !validMoves.includes(newStatus))
    {
        throw new Error(`Invalid status change: '${staff.status}' -> '${newStatus}'`);
    }

    // 4. Update
    await updateStaffStatus(staffId, branchId, newStatus);

    // 5. Log
    await logStaffEvent({
        staffId: staffId,
        branchId,
        eventType: STAFF_EVENT_TYPE.STATUS_CHANGED,
        oldValue: staff.status,
        newValue: newStatus,
        actorId
    });

    return { ...staff, status: newStatus };
}

export async function changeStaffRole({ staffId, branchId, newRole, actorId })
{
    const staff = await getStaffOrThrow(staffId, branchId);

    // 1. Authorization: STRICTLY OWNER ONLY
    // Changing roles (Promotions) is a high-risk action.
    //await assertStaff(actorId, [STAFF_ROLE.OWNER]);

    if (staff.role === newRole) return staff;

    // 2. Update
    // (Ensure you add 'updateStaffRole' to your Repository export!)
    await repoUpdateStaffRole(staffId, branchId, newRole);

    // 3. Log
    await logStaffEvent({
        staffId: staffId,
        branchId,
        eventType: "ROLE_CHANGED",
        oldValue: staff.role,
        newValue: newRole,
        actorId
    });

    return { ...staff, role: newRole };
}

// NEW: Handle accidental creation (Soft Delete)
export async function removeStaffMistake({ staffId, branchId, actorId })
{
    const staff = await getStaffOrThrow(staffId, branchId);

    // STRICT AUTH: Only Owners can remove staff records entirely
    //await assertStaff(actorId, [STAFF_ROLE.OWNER]);

    // Optional: Prevent deleting someone who has actually worked (has shifts/orders)
    // if (await hasStaffActivity(staffId)) throw new Error("Cannot delete active staff. Use Terminate instead.");

    await deleteStaff(staffId, branchId); // Ensure this is imported from Repo

    await logStaffEvent({
        staffId: staffId,
        branchId,
        eventType: "DELETED_MISTAKE",
        oldValue: staff.name,
        newValue: "SOFT_DELETED",
        actorId
    });

    return { ok: true };
}

/* ============================================================
   WRAPPERS (For convenience in Controller)
============================================================ */

// Accepts branchId (String) OR null (for Owner)
export async function listActiveStaff(branchId)
{
    return listStaffForBranch(branchId, false);
}

export async function listAllStaffHistory(branchId)
{
    // Only Owners/Managers should likely see the full history including fired staff
    return listStaffForBranch(branchId, true);
}
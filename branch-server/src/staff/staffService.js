// src/staff/staffService.js
import crypto from "crypto";
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
import { STAFF_ROLE, assertStaffRole } from "./staffRoles.js";
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

    // 1. Authorization: Only Owner/Manager can hire
    const actor = await assertStaffRole(actorId, [STAFF_ROLE.OWNER, STAFF_ROLE.MANAGER]);

    // 2. Hierarchy Check: Manager cannot hire an Owner
    assertHierarchy(actor.role, role);

    // 3. Validation
    if (await getStaffByPhone(phone))
    {
        throw new Error("Staff with this phone number already exists");
    }
    // (Add Adhaar uniqueness check here if needed)

    // 4. Create
    const staff = {
        id: crypto.randomUUID(),
        branchId,
        name,
        role,
        phone,
        adhaarNumber,
        status: STAFF_STATUS.ACTIVE,
        createdAt: Date.now(),
    };

    await insertStaff(staff);

    // 5. Log
    await logStaffEvent({
        staffId: staff.id,
        branchId,
        eventType: STAFF_EVENT_TYPE.CREATED,
        newValue: { name, role, phone }, // Log only non-sensitive initial data
        actorId
    });

    return staff;
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
    const actor = await assertStaffRole(actorId, [STAFF_ROLE.OWNER, STAFF_ROLE.MANAGER]);

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
    await assertStaffRole(actorId, [STAFF_ROLE.OWNER]);

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
    await assertStaffRole(actorId, [STAFF_ROLE.OWNER]);

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

export async function listActiveStaff(branchId)
{
    return listStaffForBranch(branchId, false);
}

export async function listAllStaffHistory(branchId)
{
    // Only Owners/Managers should likely see the full history including fired staff
    return listStaffForBranch(branchId, true);
}
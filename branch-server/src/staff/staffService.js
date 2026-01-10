import crypto from "crypto";
import { insertStaff, getStaffById, countStaff } from "./staffRepository.js";
import { STAFF_ROLE } from "./staffRoles.js";
import { STAFF_CREATION_RULES, ROLE_LEVEL } from "./staffCreationRules.js";
import { logStaffEvent } from "./staffEventRepository.js";
import { STAFF_REACTIVATION_RULES } from "./staffReactivationRules.js";


export function createStaff({ name, role, actorId })
{
    const staffCount = countStaff();
    if (staffCount === 0)
    {
        if (role !== STAFF_ROLE.OWNER)
        {
            throw new Error("First staff must be  OWNER!");
        }
        const owner = {
            id: crypto.randomUUID(),
            name,
            role: STAFF_ROLE.OWNER,
            active: true,
            createdAt: Date.now(),
        }
        insertStaff(owner);

        logStaffEvent({
            id: crypto.randomUUID(),
            staffId: owner.id,
            type: "CREATED",
            oldValue: null,
            newValue: STAFF_ROLE.OWNER,
            actorId: null, // system bootstrap
            createdAt: Date.now(),
        });


        return owner;
    }

    const actor = getStaffById(actorId);

    if (!actor || actor.active === 0)
    {
        throw new Error("Actor not active or not found");
    }

    const allowedRoles = STAFF_CREATION_RULES[actor.role];

    if (!allowedRoles || !allowedRoles.includes(role))
    {
        throw new Error(`${actor.role} is not allowed to create ${role}`);
    }

    if (!Object.values(STAFF_ROLE).includes(role))
    {
        throw new Error("Invalid staff role");
    }

    const staff = {
        id: crypto.randomUUID(),
        name,
        role,
        active: true,
        createdAt: Date.now(),
    };

    insertStaff(staff);

    logStaffEvent({
        id: crypto.randomUUID(),
        staffId: staff.id,
        type: "CREATED",
        oldValue: null,
        newValue: role,
        actorId: actor.id,
        createdAt: Date.now(),
    });

    return staff;
}

export function assertStaffRole(staffId, allowedRoles)
{
    const staff = getStaffById(staffId);
    if (!staff || staff.active === 0)
    {
        throw new Error("Staff not active or not found");
    }

    if (!allowedRoles.includes(staff.role))
    {
        throw new Error("Permission denied");
    }

    return staff;
}

export function deactivateStaff({ staffId, actorId })
{
    const actor = getStaffById(actorId);
    if (!actor || actor.active === 0)
    {
        throw new Error("Actor not active or not found");
    }

    if (![STAFF_ROLE.OWNER, STAFF_ROLE.MANAGER].includes(actor.role))
    {
        throw new Error("Permission denied");
    }

    const staff = getStaffById(staffId);
    if (!staff || staff.active === 0) throw new Error("Staff not active or not found");

    if (ROLE_LEVEL[actor.role] <= ROLE_LEVEL[staff.role])
    {
        throw new Error("Cannot deactive staff with equal or higher role!!!")
    }

    updateStaffActive(staffId, false);

    logStaffEvent({
        id: crypto.randomUUID(),
        staffId,
        type: "DEACTIVATED",
        oldValue: "ACTIVE",
        newValue: "INACTIVE",
        actorId,
        createdAt: Date.now(),
    });
}

export function reactivateStaff({ staffId, actorId })
{
    const actor = getStaffById(actorId);
    if (!actor || actor.active === 0)
    {
        throw new Error("Actor not active or not found");
    }

    const staff = getStaffById(staffId);
    if (!staff)
    {
        throw new Error("Staff not found");
    }

    if (staff.active === 1)
    {
        return; // already active, idempotent
    }

    const allowedRoles = STAFF_REACTIVATION_RULES[actor.role];
    if (!allowedRoles || !allowedRoles.includes(staff.role))
    {
        throw new Error("Permission denied");
    }

    updateStaffActive(staffId, true);

    logStaffEvent({
        id: crypto.randomUUID(),
        staffId,
        type: "REACTIVATED",
        oldValue: "INACTIVE",
        newValue: "ACTIVE",
        actorId,
        createdAt: Date.now(),
    });
}

export function changeStaffRole({ staffId, newRole, actorId })
{
    const actor = getStaffById(actorId);
    if (!actor || actor.active === 0)
    {
        throw new Error("Actor not active or not found");
    }

    if (actor.role !== STAFF_ROLE.OWNER)
    {
        throw new Error("Only owner can change roles");
    }

    const staff = getStaffById(staffId);
    if (!staff) throw new Error("Staff not found");

    updateStaffRole(staffId, newRole);

    logStaffEvent({
        id: crypto.randomUUID(),
        staffId,
        type: "ROLE_CHANGED",
        oldValue: staff.role,
        newValue: newRole,
        actorId,
        createdAt: Date.now(),
    });
}


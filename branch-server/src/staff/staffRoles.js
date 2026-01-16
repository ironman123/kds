import { getStaffByIdGlobal } from "./staffRepository.js";

export const STAFF_ROLE = {
    WAITER: "WAITER",
    KITCHEN: "KITCHEN",
    CAPTAIN: "CAPTAIN",
    MANAGER: "MANAGER",
    OWNER: "OWNER",
};

export async function assertStaffRole(actorId, allowedRoles)
{
    if (!actorId)
    {
        throw new Error("Access Denied: No actor ID provided");
    }

    // 1. Fetch the actor from DB
    // We use the global lookup because the actor might be an owner 
    // accessing a branch they aren't explicitly "assigned" to in the basic sense,
    // or we just need to verify identity first.
    const actor = await getStaffByIdGlobal(actorId);

    // 2. Check Existence
    if (!actor)
    {
        throw new Error("Access Denied: User not found");
    }

    // 3. Check Status (Security Critical)
    // Terminated or suspended staff should not be able to do anything.
    if (actor.status !== 'ACTIVE')
    {
        throw new Error(`Access Denied: User status is ${actor.status}`);
    }

    // 4. Check Role
    if (!allowedRoles.includes(actor.role))
    {
        throw new Error(`Access Denied: Insufficient permissions. Required: [${allowedRoles.join(', ')}]`);
    }

    return actor;
}
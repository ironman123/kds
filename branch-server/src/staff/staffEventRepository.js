// src/staff/staffEventRepository.js
import db from "../db.js";
import crypto from "crypto";

export const STAFF_EVENT_TYPE = {
    CREATED: 'CREATED',
    PROFILE_UPDATED: 'PROFILE_UPDATED',
    STATUS_CHANGED: 'STATUS_CHANGED',
    ASSIGNMENT_CHANGE: 'ASSIGNMENT_CHANGE' // Useful addition for multi-branch apps
};

// 🔧 UPDATE: Added 'branchId' to arguments and insert
export async function logStaffEvent({ staffId, branchId, eventType, oldValue, newValue, actorId })
{
    // Safety fallback: If no branchId is provided (e.g. system background job), 
    // we might insert NULL, but ideally, every event belongs to a branch.

    await db('staff_events').insert({
        id: crypto.randomUUID(),
        staff_id: staffId,
        branch_id: branchId, // ✅ CRITICAL FOR SYNC
        event_type: eventType,
        old_value: oldValue ? JSON.stringify(oldValue) : null,
        new_value: newValue ? JSON.stringify(newValue) : null,
        actor_id: actorId || 'SYSTEM',
        created_at: Date.now()
    });
}

// 🔧 UPDATE: Optional - You might want to filter history by branch, 
// but usually getting all history for a staff member (across branches) is better.
export async function getStaffHistory(staffId)
{
    const rows = await db('staff_events')
        .where({ staff_id: staffId })
        .orderBy('created_at', 'desc');

    // Helper to parse the JSON back to objects for the frontend
    return rows.map(row => ({
        ...row,
        oldValue: row.old_value ? JSON.parse(row.old_value) : null,
        newValue: row.new_value ? JSON.parse(row.new_value) : null,
        branchId: row.branch_id
    }));
}
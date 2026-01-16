// src/staff/staffEventRepository.js
import db from "../db.js";
import crypto from "crypto";

export const STAFF_EVENT_TYPE = {
    CREATED: 'CREATED',
    PROFILE_UPDATED: 'PROFILE_UPDATED',
    STATUS_CHANGED: 'STATUS_CHANGED',
    // TERMINATED: 'TERMINATED', // Optional, or just use STATUS_CHANGED
};

export async function logStaffEvent({ staffId, eventType, oldValue, newValue, actorId })
{
    await db('staff_events').insert({
        id: crypto.randomUUID(),
        staff_id: staffId,
        event_type: eventType,
        old_value: oldValue ? JSON.stringify(oldValue) : null, // Store objects as strings
        new_value: newValue ? JSON.stringify(newValue) : null,
        actor_id: actorId || 'SYSTEM', // Fallback if no actor provided
        created_at: Date.now()
    });
}

// Optional: View history
export async function getStaffHistory(staffId)
{
    return db('staff_events')
        .where({ staff_id: staffId })
        .orderBy('created_at', 'desc');
}
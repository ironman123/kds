import db from "../db.js";

export function logStaffEvent(event)
{
    db.prepare(`
    INSERT INTO staff_events
    (id, staff_id, event_type, old_value, new_value, actor_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
        event.id,
        event.staffId,
        event.type,
        event.oldValue,
        event.newValue,
        event.actorId,
        event.createdAt
    );
}

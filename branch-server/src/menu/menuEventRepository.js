import db from "../db.js";

export function logMenuEvent(event)
{
    db.prepare(`
    INSERT INTO menu_events
    (id, entity_type, entity_id, event_type, old_value, new_value, actor_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
        event.id,
        event.entityType,
        event.entityId,
        event.type,
        event.oldValue,
        event.newValue,
        event.actorId,
        event.createdAt
    );
}

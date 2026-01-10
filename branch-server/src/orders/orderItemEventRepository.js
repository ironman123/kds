import db from "../db.js";

export function logOrderItemEvent(event)
{
    db.prepare(`
    INSERT INTO order_events
    (id, order_id, event_type, old_value, new_value, actor_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
        event.id,
        event.orderId,
        event.type,
        event.oldValue,
        event.newValue,
        event.actorId,
        event.createdAt
    );
}

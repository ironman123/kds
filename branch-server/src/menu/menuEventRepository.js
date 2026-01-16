import db from "../db.js";

export async function logMenuEvent(event)
{
    await db('menu_events').insert({
        id: event.id,
        entity_type: event.entityType,
        entity_id: event.entityId,
        event_type: event.type,
        old_value: event.oldValue ? String(event.oldValue) : null,
        new_value: event.newValue ? String(event.newValue) : null,
        actor_id: event.actorId || 'SYSTEM',
        created_at: event.createdAt
    });
}
import db from "../db.js";

export async function logOrderItemEvent(event)
{
    // 👇 CRITICAL: Make sure this says 'order_item_events'
    await db('order_item_events').insert({
        id: event.id,
        branch_id: event.branchId,
        order_id: event.orderId,
        order_item_id: event.itemId,
        event_type: event.type,
        old_value: event.oldValue ? String(event.oldValue) : null,
        new_value: event.newValue ? String(event.newValue) : null,
        actor_id: event.actorId || 'SYSTEM',
        created_at: event.createdAt
    });
}
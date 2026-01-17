import db from "../db.js";

export async function logOrderItemEvent(event)
{
    await db('order_item_events').insert({ // Changed table name to be specific (Recommended)
        id: event.id,
        branch_id: event.branchId,      // ✅ SYNC: Required
        order_id: event.orderId,
        order_item_id: event.itemId,    // ✅ LOGIC: Track which item changed
        event_type: event.type,
        old_value: event.oldValue ? String(event.oldValue) : null,
        new_value: event.newValue ? String(event.newValue) : null,
        actor_id: event.actorId || 'SYSTEM',
        created_at: event.createdAt
    });
}
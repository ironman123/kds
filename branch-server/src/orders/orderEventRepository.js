// src/orders/orderEventRepository.js
import db from "../db.js";

export async function logOrderEvent(event)
{
    await db('order_events').insert({
        id: event.id,
        branch_id: event.branchId, // ✅ SYNC: Required to track which branch this event belongs to
        order_id: event.orderId,
        event_type: event.type,
        old_value: event.oldValue ? String(event.oldValue) : null, // Safely convert to string
        new_value: event.newValue ? String(event.newValue) : null,
        actor_id: event.actorId || 'SYSTEM', // Fallback for system-generated events
        created_at: event.createdAt
    });
}
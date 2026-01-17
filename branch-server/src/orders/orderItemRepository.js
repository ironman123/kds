import db from "../db.js";

/* ============================================================
   READ OPERATIONS
============================================================ */

export async function getOrderItemById(itemId)
{
    const row = await db('order_items')
        .where({ id: itemId })
        .whereNull('deleted_at') // 🛡️ Sync: Hide deleted items
        .first();

    return row ? mapRowToOrderItem(row) : null;
}

export async function getItemsForOrder(orderId)
{
    const rows = await db('order_items')
        .where({ order_id: orderId })
        .whereNull('deleted_at')
        .orderBy('created_at', 'asc'); // Kitchen likes FIFO

    return rows.map(mapRowToOrderItem);
}

export async function countItemsForOrder(orderId)
{
    const result = await db('order_items')
        .where({ order_id: orderId })
        .whereNull('deleted_at')
        .count('id as count')
        .first();

    return result.count || 0;
}

/* ============================================================
   WRITE OPERATIONS (Single)
============================================================ */

export async function insertOrderItem(item)
{
    await db('order_items').insert({
        id: item.id,
        order_id: item.orderId,
        menu_item_id: item.menuItemId,
        quantity: item.quantity,
        notes: item.notes || null,
        status: item.status || 'PENDING',
        created_at: Date.now(),
        updated_at: Date.now(), // ✅ Sync: Initial timestamp
        deleted_at: null
    });
}

// Optimized status update that handles specific Kitchen Timestamps
export async function updateOrderItemStatus(itemId, newStatus, additionalUpdates = {})
{
    const updates = {
        status: newStatus,
        updated_at: Date.now(), // ✅ Sync: Mark as dirty
        ...additionalUpdates // e.g., { started_at: ... } or { completed_at: ... }
    };

    await db('order_items')
        .where({ id: itemId })
        .update(updates);
}

// Update Notes (e.g. Waiter forgot "No Onions")
export async function updateOrderItemNotes(itemId, notes)
{
    await db('order_items')
        .where({ id: itemId })
        .update({
            notes: notes,
            updated_at: Date.now() // ✅ Sync
        });
}

// 🗑️ Soft Delete (Voiding an item cleanly)
export async function deleteOrderItemRepo(itemId)
{
    await db('order_items')
        .where({ id: itemId })
        .update({
            deleted_at: Date.now(), // ✅ Sync: Soft Delete
            updated_at: Date.now()
        });
}

/* ============================================================
   WRITE OPERATIONS (Batch)
   Crucial for POS performance (Punching 5 items at once)
============================================================ */

export async function insertOrderItemsBatch(items)
{
    const now = Date.now();

    // Map array of objects to DB rows
    const rows = items.map(item => ({
        id: item.id,
        order_id: item.orderId,
        menu_item_id: item.menuItemId,
        quantity: item.quantity,
        notes: item.notes || null,
        status: item.status || 'PENDING',
        created_at: now,
        updated_at: now, // ✅ Sync
        deleted_at: null
    }));

    await db('order_items').insert(rows);
}

/* ============================================================
   HELPER
============================================================ */
function mapRowToOrderItem(row)
{
    return {
        id: row.id,
        orderId: row.order_id,
        menuItemId: row.menu_item_id,
        quantity: row.quantity,
        notes: row.notes,
        status: row.status,
        startedAt: row.started_at,
        completedAt: row.completed_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        deletedAt: row.deleted_at
    };
}
import db from "../db.js";

export function insertOrderItem(item)
{
    db.prepare(`
    INSERT INTO order_items
    (id, order_id, menu_item_id, quantity, notes)
    VALUES (?, ?, ?, ?, ?)
  `).run(
        item.id,
        item.orderId,
        item.menuItemId,
        item.quantity,
        item.notes
    );
}

export function getItemsForOrder(orderId)
{
    return db
        .prepare(`
      SELECT *
      FROM order_items
      WHERE order_id = ?
    `)
        .all(orderId);
}

export function getOrderItemById(itemId)
{
    return db
        .prepare(`SELECT * FROM order_items WHERE id = ?`)
        .get(itemId);
}

export function countItemsForOrder(orderId)
{
    return db
        .prepare(`
        SELECT COUNT(*) as count
        FROM order_items
        WHERE order_id = ?
        `).get(orderId).count;
}

export function updateOrderItemStatus(itemId, newStatus, startedAt, completedAt)
{
    db.prepare(`
    UPDATE order_items
    SET status = ?,
        started_at = ?,
        completed_at = ?
    WHERE id = ?
  `).run(newStatus, startedAt, completedAt, itemId);
}

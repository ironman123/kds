import db from "../db.js";

export function insertOrder(order)
{
  const stmt = db.prepare(`
    INSERT INTO orders (id, table_id, waiter_id, status, serve_policy, created_at, updated_at, customer_name, customer_phone)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    order.id,
    order.tableId,
    order.waiterId,
    order.status,
    order.servePolicy,
    order.createdAt,
    order.updatedAt,
    order.customerName,
    order.customerPhone
  );
}

export function getOrderByIdRepo(orderId)
{
  return db
    .prepare(`SELECT * FROM orders WHERE id = ?`)
    .get(orderId);
}

export function updateOrderStatus(orderId, newStatus, updatedAt)
{
  const now = Date.now();
  db.prepare(`
    UPDATE orders
    SET status = ?, updated_at = ?
    WHERE id = ?
  `).run(newStatus, now, orderId);
}

export function countUnservedItemsForTable(tableId)
{
  return db.prepare(`
    SELECT COUNT(*) as count
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    WHERE o.table_id = ?
      AND oi.status != 'SERVED'
  `).get(tableId).count;
}

export function getActiveOrdersRepo()
{
  return db.prepare(`
    SELECT *
    FROM orders
    WHERE status NOT IN ('COMPLETED', 'CANCELLED')
    ORDER BY created_at ASC
  `).all();
}

export function getOrdersForTableRepo(tableId)
{
  return db.prepare(`
    SELECT *
    FROM orders
    WHERE table_id = ?
    ORDER BY created_at DESC
  `).all(tableId);
}

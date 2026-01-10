import db from "../db.js";

export function hasActiveItemsForTable(tableId)
{
    const row = db.prepare(`
    SELECT COUNT(*) as count
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE o.table_id = ?
      AND oi.status != 'SERVED'
  `).get(tableId);

    return row.count > 0;
}

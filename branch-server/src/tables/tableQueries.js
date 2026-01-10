import db from "../db.js";

export function getTableWaitingTimes()
{
    return db.prepare(`
    SELECT
      t.id,
      t.label,
      MIN(o.created_at) as since
    FROM tables t
    JOIN orders o ON o.table_id = t.id
    WHERE o.status != 'SERVED'
    GROUP BY t.id
  `).all();
}

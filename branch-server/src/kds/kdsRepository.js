import db from "../db.js";

export function getPendingKdsItems()
{
    return db.prepare(`
    SELECT
      oi.id AS order_item_id,
      oi.order_id,
      oi.menu_item_id,
      oi.quantity,
      oi.notes,
      oi.created_at,
      mi.name AS item_name,
      mi.prep_time,
      t.id AS table_id
    FROM order_items oi
    JOIN menu_items mi ON mi.id = oi.menu_item_id
    JOIN orders o ON o.id = oi.order_id
    JOIN tables t ON t.id = o.table_id
    WHERE oi.status = 'PENDING'
    ORDER BY oi.created_at ASC
  `).all();
}

export function getPreparingKdsItems()
{
    return db.prepare(`
    SELECT
      oi.id AS order_item_id,
      oi.order_id,
      oi.menu_item_id,
      mi.name AS item_name,
      oi.quantity,
      oi.started_at
    FROM order_items oi
    JOIN menu_items mi ON mi.id = oi.menu_item_id
    WHERE oi.status = 'PREPARING'
    ORDER BY oi.started_at ASC
  `).all();
}

export function getReadyKdsItems()
{
    return db.prepare(`
    SELECT
      oi.id AS order_item_id,
      oi.order_id,
      mi.name AS item_name,
      oi.quantity,
      oi.completed_at
    FROM order_items oi
    JOIN menu_items mi ON mi.id = oi.menu_item_id
    WHERE oi.status = 'READY'
    ORDER BY oi.completed_at ASC
  `).all();
}

export function getKdsItems()
{
    return db.prepare(`
    SELECT
      o.id              AS order_id,
      o.created_at      AS order_created_at,
      o.serve_policy,

      t.id              AS table_id,

      oi.id             AS order_item_id,
      oi.status         AS item_status,
      oi.quantity,
      oi.notes,
      oi.started_at,
      oi.completed_at,

      mi.name           AS item_name,
      mi.prep_time

    FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    JOIN menu_items mi ON mi.id = oi.menu_item_id
    JOIN tables t ON t.id = o.table_id

    WHERE oi.status != 'SERVED'
    ORDER BY o.created_at ASC
  `).all();
}
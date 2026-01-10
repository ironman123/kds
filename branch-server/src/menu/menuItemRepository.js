import db from "../db.js";

export function insertMenuItem(item)
{
  db.prepare(`
    INSERT INTO menu_items (
      id,
      category_id,
      name,
      price,
      available,
      prep_time,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    item.id,
    item.categoryId,
    item.name,
    item.price,
    item.available ? 1 : 0,
    item.prepTime ?? null,
    item.createdAt,
    item.updatedAt
  );
}


export function updateMenuAvailability(itemId, available)
{
  db.prepare(`
    UPDATE menu_items
    SET available = ?, updated_at = ?
    WHERE id = ?
  `).run(available ? 1 : 0, Date.now(), itemId);
}


export function getMenuItemByNameInCategory(name, categoryId)
{
  return db.prepare(`
    SELECT *
    FROM menu_items
    WHERE category_id = ?
      AND LOWER(TRIM(name)) = LOWER(TRIM(?))
    LIMIT 1
  `).get(categoryId, name);
}

export function updateMenuItemPrice(itemId, newPrice)
{
  db.prepare(`
    UPDATE menu_items
    SET price = ?, updated_at = ?
    WHERE id = ?
    `).run(newPrice, Date.now(), itemId);
}

export function getAvailableMenuItems()
{
  return db
    .prepare(`
      SELECT *
      FROM menu_items
      WHERE available = 1
    `)
    .all();
}

export function getMenuByCategory()
{
  return db.prepare(`
    SELECT
      c.id as category_id,
      c.name as category_name,
      m.id as item_id,
      m.name as item_name,
      m.price,
      m.prep_time
    FROM menu_categories c
    JOIN menu_items m ON m.category_id = c.id
    WHERE c.available = 1 AND m.available = 1
    ORDER BY c.sort_order, m.name
  `).all();
}

export function listAllMenuItems()
{
  return db.prepare(`
    SELECT * FROM menu_items
    ORDER BY category_id, name
  `).all();
}

export function listEnabledMenuItems()
{
  return db.prepare(`
    SELECT * FROM menu_items
    WHERE available = 1
    ORDER BY category_id, name
  `).all();
}

export function updateMenuItemRepo({ itemId, name, prepTime })
{
  console.log(itemId, name, prepTime);
  db.prepare(`
    UPDATE menu_items
    SET name = ?, prep_time = ?
    WHERE id = ?
  `).run(name, prepTime, itemId);
}

export function updateMenuItemCategory(itemId, categoryId)
{
  console.log(itemId, categoryId);
  db.prepare(`
    UPDATE menu_items
    SET category_id = ?
    WHERE id = ?
  `).run(categoryId, itemId);
}


export function getMenuItemByIdRepo(itemId)
{
  return db.prepare(`
    SELECT * FROM menu_items
    WHERE id = ?
    `).get(itemId);
}
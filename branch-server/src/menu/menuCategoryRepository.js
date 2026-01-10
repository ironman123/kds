import db from "../db.js";

export function insertCategory(category)
{
  db.prepare(`
    INSERT INTO menu_categories
    (id, name, sort_order, available, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    category.id,
    category.name,
    category.sortOrder,
    category.available ? 1 : 0,
    category.createdAt,
    category.updatedAt
  );
}

export function getActiveCategories()
{
  return db.prepare(`
    SELECT *
    FROM menu_categories
    WHERE available = 1
    ORDER BY sort_order ASC
  `).all();
}

export function getCategoryById(categoryId)
{
  return db
    .prepare(`SELECT * FROM menu_categories WHERE id = ?`)
    .get(categoryId);
}

export function getCategoryByName(name)
{
  return db.prepare(`
    SELECT * FROM menu_categories
    WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))
    LIMIT 1
  `).get(name);
}

export function updateCategoryActivity(categoryId, available)
{
  db.prepare(`
    UPDATE menu_categories
    SET available = ?, updated_at = ?
    WHERE id = ?
  `).run(available ? 1 : 0, Date.now(), categoryId);
}

export function updateCategoryRepo({ categoryId, newName, newSortOrder })
{
  const fields = [];
  const values = [];

  if (newName !== undefined)
  {
    fields.push("name = ?");
    values.push(newName);
  }

  if (newSortOrder !== undefined)
  {
    fields.push("sort_order = ?");
    values.push(newSortOrder);
  }

  if (fields.length === 0)
  {
    return; // nothing to update
  }

  // always update timestamp
  fields.push("updated_at = ?");
  values.push(Date.now());

  // WHERE id = ?
  values.push(categoryId);

  const sql = `
    UPDATE menu_categories
    SET ${fields.join(", ")}
    WHERE id = ?
  `;

  db.prepare(sql).run(...values);
}


export function listAllCategories()
{
  return db.prepare(`
    SELECT * FROM menu_categories
    ORDER BY sort_order ASC
  `).all();
}

export function listEnabledCategories()
{
  return db.prepare(`
    SELECT * FROM menu_categories
    WHERE available = 1
    ORDER BY sort_order ASC
  `).all();
}

export function countItemsInCategory(categoryId)
{
  const row = db.prepare(`
    SELECT COUNT(*) AS count
    FROM menu_items
    WHERE category_id = ?
  `).get(categoryId);

  return row.count;
}

export function deleteCategoryRepo(categoryId)
{
  return db.prepare(`
    DELETE FROM menu_categories
    WHERE id = ?
  `).run(categoryId);
}
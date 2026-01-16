import db from "../db.js";

/* ============================================================
   READ OPERATIONS
============================================================ */

// 🔍 WHAT: Fetches one item, but JOINS category to check the Branch ID.
// 🛡️ WHY:  Security (Tenant Isolation). We MUST check the parent category to ensure 
//          User A isn't viewing User B's item.
export async function getMenuItemById(itemId, branchId)
{
  const row = await db('menu_items')
    .join('menu_categories', 'menu_items.category_id', 'menu_categories.id')
    .select('menu_items.*', 'menu_categories.name as category_name')
    .where('menu_items.id', itemId)
    .andWhere('menu_categories.branch_id', branchId) // <--- The Security Guard
    .first();

  return row ? mapRowToItem(row) : null;
}

// 🔍 WHAT: Checks if an item with this name already exists in a category.
// 🛡️ WHY:  Data Integrity. Prevents duplicates like ["Burger", "Burger"].
//          Now includes branchId check for strict security (IDOR protection).
export async function getMenuItemByNameInCategory(name, categoryId, branchId)
{
  const row = await db('menu_items')
    .join('menu_categories', 'menu_items.category_id', 'menu_categories.id')
    .where('menu_items.category_id', categoryId)
    .andWhere('menu_categories.branch_id', branchId) // <--- Strict Check
    .andWhereRaw('LOWER(TRIM(menu_items.name)) = LOWER(TRIM(?))', [name])
    .select('menu_items.*')
    .first();

  return row ? mapRowToItem(row) : null;
}

// 🔍 WHAT: Lists all items for a specific branch.
// 🛡️ WHY:  Core Feature. Populates POS and Admin screens.
export async function listMenuItemsRepo(branchId, onlyAvailable = false)
{
  const query = db('menu_items')
    .join('menu_categories', 'menu_items.category_id', 'menu_categories.id')
    .select('menu_items.*', 'menu_categories.name as category_name')
    .where('menu_categories.branch_id', branchId)
    .orderBy('menu_categories.sort_order')
    .orderBy('menu_items.name');

  if (onlyAvailable)
  {
    query.where('menu_items.available', 1);
    query.andWhere('menu_categories.available', 1);
  }

  const rows = await query;
  return rows.map(mapRowToItem);
}

// 🔍 WHAT: Finds IDs of items named "Burger" across specific branches.
// 🛡️ WHY:  Enabler for Simple Batch Updates (Price/Name changes).
export async function findItemsByNameInBranches(name, branchIds)
{
  return db('menu_items')
    .join('menu_categories', 'menu_items.category_id', 'menu_categories.id')
    .select('menu_items.id')
    .whereIn('menu_categories.branch_id', branchIds)
    .andWhereRaw('LOWER(menu_items.name) = LOWER(?)', [name]);
}

// 🔍 WHAT: Finds items AND their branch IDs.
// 🛡️ WHY:  Enabler for "Smart Move". We need to know which branch an item belongs to
//          so we can move it to the correct destination category in that specific branch.
export async function findItemIdsByName(name, branchIds)
{
  return db('menu_items')
    .join('menu_categories', 'menu_items.category_id', 'menu_categories.id')
    .select('menu_items.id as item_id', 'menu_categories.branch_id')
    .whereIn('menu_categories.branch_id', branchIds)
    .andWhereRaw('LOWER(TRIM(menu_items.name)) = LOWER(TRIM(?))', [name]);
}

/* ============================================================
   WRITE OPERATIONS (Single)
============================================================ */

export async function insertMenuItem(item)
{
  await db('menu_items').insert({
    id: item.id,
    category_id: item.categoryId,
    name: item.name,
    price: item.price,
    available: item.available ? 1 : 0,
    prep_time: item.prepTime ?? null,
    created_at: item.createdAt,
    updated_at: item.updatedAt
  });
}

export async function updateMenuItemRepo(itemId, updates)
{
  const dbUpdates = { updated_at: Date.now() };

  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.price !== undefined) dbUpdates.price = updates.price;
  if (updates.prepTime !== undefined) dbUpdates.prep_time = updates.prepTime;
  if (updates.available !== undefined) dbUpdates.available = updates.available ? 1 : 0;
  if (updates.categoryId !== undefined) dbUpdates.category_id = updates.categoryId;

  await db('menu_items')
    .where({ id: itemId })
    .update(dbUpdates);
}

export async function deleteMenuItemRepo(itemId)
{
  return db('menu_items').where({ id: itemId }).del();
}

/* ============================================================
   WRITE OPERATIONS (Batch)
============================================================ */

// 🚀 WHAT: Inserts multiple items in ONE database call.
export async function insertMenuItemsBatch(items)
{
  await db('menu_items').insert(
    items.map(item => ({
      id: item.id,
      category_id: item.categoryId,
      name: item.name,
      price: item.price,
      available: item.available ? 1 : 0,
      prep_time: item.prepTime,
      created_at: item.createdAt,
      updated_at: item.updatedAt
    }))
  );
}

// 🚀 WHAT: Updates simple fields (Price/Name) for multiple IDs.
export async function updateMenuItemsBatch({ itemIds, updates })
{
  const dbUpdates = { updated_at: Date.now() };
  if (updates.name) dbUpdates.name = updates.name;
  if (updates.price) dbUpdates.price = updates.price;
  if (updates.prepTime) dbUpdates.prep_time = updates.prepTime;
  if (updates.available !== undefined) dbUpdates.available = updates.available ? 1 : 0;

  return db('menu_items')
    .whereIn('id', itemIds)
    .update(dbUpdates);
}

// 🚀 WHAT: Updates Categories for specific items (Complex Logic).
// 🛡️ WHY:  Used by "Smart Move". Since every item moves to a *different* category ID 
//          (based on its branch), we cannot use a simple .whereIn().update().
//          We must loop through the moves in a transaction.
export async function updateItemCategoriesBatch(moves)
{
  // moves = [{ itemId: 'uuid1', categoryId: 'cat_uuid_A' }, { itemId: 'uuid2', categoryId: 'cat_uuid_B' }]
  await db.transaction(async (trx) =>
  {
    for (const move of moves)
    {
      await trx('menu_items')
        .where({ id: move.itemId })
        .update({
          category_id: move.categoryId,
          updated_at: Date.now()
        });
    }
  });
}

// 🚀 WHAT: Deletes multiple items.
export async function deleteMenuItemsBatch(itemIds)
{
  return db('menu_items')
    .whereIn('id', itemIds)
    .del();
}

/* ============================================================
   HELPER
============================================================ */
function mapRowToItem(row)
{
  return {
    id: row.id,
    categoryId: row.category_id,
    categoryName: row.category_name,
    name: row.name,
    price: row.price,
    available: row.available === 1,
    prepTime: row.prep_time,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
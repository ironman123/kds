// src/menu/menuItemRepository.js
import db from "../db.js";
import { getRecipeByMenuItemId } from "./recipeRepository.js";
import { getIngredientsForRecipe } from "./recipeIngredientRepository.js";

/* ============================================================
   READ OPERATIONS
============================================================ */

export async function getMenuItemById(itemId, branchId)
{
  const query = db('menu_items')
    .join('menu_categories', 'menu_items.category_id', 'menu_categories.id')
    .leftJoin('branch', 'menu_categories.branch_id', 'branch.id') // 👈 JOIN BRANCH
    .select(
      'menu_items.*',
      'menu_categories.name as category_name',
      'menu_categories.branch_id',
      'branch.name as branch_name' // 👈 SELECT BRANCH NAME
    )
    .where('menu_items.id', itemId)
    .whereNull('menu_items.deleted_at')
    .first();

  // 🧠 FIX: Only enforce branch check if NOT Owner (Manager context)
  if (branchId)
  {
    query.where('menu_categories.branch_id', branchId);
  }

  const row = await query;
  if (!row) return null;

  const item = mapRowToItem(row);

  // 🧠 FETCH RECIPE
  const recipe = await getRecipeByMenuItemId(item.id, branchId || item.branchId); // Use item.branchId if global
  if (recipe)
  {
    const ingredients = await getIngredientsForRecipe(recipe.id);
    item.recipe = { ...recipe, ingredients };
  }

  return item;
}

export async function listMenuItemsRepo(branchId, onlyAvailable = false)
{
  const query = db('menu_items')
    .join('menu_categories', 'menu_items.category_id', 'menu_categories.id')
    .leftJoin('branch', 'menu_categories.branch_id', 'branch.id') // 👈 JOIN BRANCH
    .select(
      'menu_items.*',
      'menu_categories.name as category_name',
      'menu_categories.branch_id',
      'branch.name as branch_name'
    )
    .whereNull('menu_items.deleted_at')
    .orderBy('branch.name') // Group by branch first for cleaner data
    .orderBy('menu_categories.sort_order')
    .orderBy('menu_items.name');

  // 🧠 FIX: Handle Owner (null branchId)
  if (branchId)
  {
    query.where('menu_categories.branch_id', branchId);
  }

  if (onlyAvailable)
  {
    query.where('menu_items.available', 1);
    query.andWhere('menu_categories.available', 1);
  }

  const rows = await query;

  // 🧠 OPTIMIZATION: Fetch recipes in parallel
  const items = await Promise.all(rows.map(async (row) =>
  {
    const item = mapRowToItem(row);
    // Optional: Only fetch recipe for single item view to save performance?
    // For now, we fetch it as requested.
    const recipe = await getRecipeByMenuItemId(item.id, item.branchId);
    if (recipe)
    {
      const ingredients = await getIngredientsForRecipe(recipe.id);
      item.recipe = { ...recipe, ingredients };
    }
    return item;
  }));

  return items;
}

export async function getMenuItemByNameInCategory(name, categoryId, branchId)
{
  const row = await db('menu_items')
    .join('menu_categories', 'menu_items.category_id', 'menu_categories.id')
    .where('menu_items.category_id', categoryId)
    .andWhere('menu_categories.branch_id', branchId)
    .whereNull('menu_items.deleted_at') // 🛡️ SYNC
    .andWhereRaw('LOWER(TRIM(menu_items.name)) = LOWER(TRIM(?))', [name])
    .select('menu_items.*')
    .first();

  return row ? mapRowToItem(row) : null;
}

export async function findItemsByNameInBranches(name, branchIds)
{
  return db('menu_items')
    .join('menu_categories', 'menu_items.category_id', 'menu_categories.id')
    .select('menu_items.id')
    .whereIn('menu_categories.branch_id', branchIds)
    .whereNull('menu_items.deleted_at') // 🛡️ SYNC
    .andWhereRaw('LOWER(menu_items.name) = LOWER(?)', [name]);
}

export async function findItemIdsByName(name, branchIds)
{
  return db('menu_items')
    .join('menu_categories', 'menu_items.category_id', 'menu_categories.id')
    .select('menu_items.id as item_id', 'menu_categories.branch_id')
    .whereIn('menu_categories.branch_id', branchIds)
    .whereNull('menu_items.deleted_at') // 🛡️ SYNC
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
    updated_at: item.updatedAt,
    deleted_at: null // ✅ SYNC: Active
  });
}

export async function updateMenuItemRepo(itemId, updates)
{
  const dbUpdates = { updated_at: Date.now() }; // ✅ SYNC: Mark dirty

  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.price !== undefined) dbUpdates.price = updates.price;
  if (updates.prepTime !== undefined) dbUpdates.prep_time = updates.prepTime;
  if (updates.available !== undefined) dbUpdates.available = updates.available ? 1 : 0;
  if (updates.categoryId !== undefined) dbUpdates.category_id = updates.categoryId;

  await db('menu_items')
    .where({ id: itemId })
    .whereNull('deleted_at') // Safety
    .update(dbUpdates);
}

// 🗑️ Soft Delete
export async function deleteMenuItemRepo(itemId)
{
  // 🛑 STOP: No more .del()
  return db('menu_items')
    .where({ id: itemId })
    .update({
      deleted_at: Date.now(), // ✅ SYNC
      updated_at: Date.now()
    });
}

/* ============================================================
   WRITE OPERATIONS (Batch)
============================================================ */

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
      updated_at: item.updatedAt,
      deleted_at: null // ✅ SYNC
    }))
  );
}

export async function updateMenuItemsBatch({ itemIds, updates })
{
  const dbUpdates = { updated_at: Date.now() };
  if (updates.name) dbUpdates.name = updates.name;
  if (updates.price !== undefined) dbUpdates.price = updates.price;
  if (updates.prepTime !== undefined) dbUpdates.prep_time = updates.prepTime;
  if (updates.available !== undefined) dbUpdates.available = updates.available ? 1 : 0;

  return await db('menu_items')
    .whereIn('id', itemIds)
    .whereNull('deleted_at')
    .update(dbUpdates);
}

export async function updateItemCategoriesBatch(moves)
{
  await db.transaction(async (trx) =>
  {
    for (const move of moves)
    {
      await trx('menu_items')
        .where({ id: move.itemId })
        .whereNull('deleted_at')
        .update({
          category_id: move.categoryId,
          updated_at: Date.now() // ✅ SYNC
        });
    }
  });
}

// 🗑️ Batch Soft Delete
export async function deleteMenuItemsBatch(itemIds)
{
  return db('menu_items')
    .whereIn('id', itemIds)
    .update({
      deleted_at: Date.now(),
      updated_at: Date.now()
    });
}

/* ============================================================
   HELPER
============================================================ */
function mapRowToItem(row)
{
  return {
    id: row.id,
    branchId: row.branch_id,     // 👈 Added
    branchName: row.branch_name, // 👈 Added
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
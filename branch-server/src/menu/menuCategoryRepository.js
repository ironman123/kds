// src/menu/menuCategoryRepository.js
import db from "../db.js";

/* ============================================================
   READ OPERATIONS
============================================================ */

export async function getCategoryById(categoryId, branchId)
{
  const row = await db('menu_categories')
    .where({ id: categoryId, branch_id: branchId })
    .whereNull('deleted_at') // 🛡️ SYNC: Hide ghosts
    .first();

  return row ? mapRowToCategory(row) : null;
}

export async function getCategoryByName(name, branchId)
{
  const row = await db('menu_categories')
    .whereRaw('LOWER(TRIM(name)) = LOWER(TRIM(?))', [name])
    .andWhere({ branch_id: branchId })
    .whereNull('deleted_at') // 🛡️ SYNC
    .first();

  return row ? mapRowToCategory(row) : null;
}

// 🔍 WHAT: Finds category IDs by name across multiple branches.
export async function findCategoryIdsByName(name, branchIds)
{
  return db('menu_categories')
    .select('id', 'branch_id')
    .whereIn('branch_id', branchIds)
    .whereNull('deleted_at') // 🛡️ SYNC
    .andWhereRaw('LOWER(TRIM(name)) = LOWER(TRIM(?))', [name]);
}

export async function listCategoriesRepo(branchId, onlyAvailable = false)
{
  const query = db('menu_categories')
    .where({ branch_id: branchId })
    .whereNull('deleted_at') // 🛡️ SYNC
    .orderBy('sort_order', 'asc');

  if (onlyAvailable)
  {
    query.where({ available: 1 });
  }

  const rows = await query;
  return rows.map(mapRowToCategory);
}

export async function countItemsInCategory(categoryId, branchId)
{
  // 🛡️ SYNC: Only count active items. 
  // If items are soft-deleted, the category is technically empty and safe to delete.
  const result = await db('menu_items')
    .count('id as count')
    .where({ category_id: categoryId })
    .whereNull('deleted_at')
    .first();

  return result.count || 0;
}

// Helper to check safety across multiple branches (Batch Delete Safety)
export async function checkItemsExistInCategoryName({ targetBranchIds, name })
{
  const result = await db('menu_items')
    .join('menu_categories', 'menu_items.category_id', 'menu_categories.id')
    .whereIn('menu_categories.branch_id', targetBranchIds)
    .andWhereRaw('LOWER(menu_categories.name) = LOWER(?)', [name])
    .whereNull('menu_items.deleted_at')      // 🛡️ Ignore deleted items
    .whereNull('menu_categories.deleted_at') // 🛡️ Ignore deleted categories
    .count('menu_items.id as count')
    .first();

  return (result.count || 0) > 0;
}

/* ============================================================
   WRITE OPERATIONS (Single)
============================================================ */

export async function insertCategory(category)
{
  await db('menu_categories').insert({
    id: category.id,
    name: category.name,
    sort_order: category.sortOrder,
    available: category.available ? 1 : 0,
    branch_id: category.branchId,
    created_at: category.createdAt,
    updated_at: category.updatedAt,
    deleted_at: null // ✅ SYNC: Active
  });
}

export async function updateCategoryRepo(categoryId, branchId, updates)
{
  const dbUpdates = { updated_at: Date.now() }; // ✅ SYNC: Mark dirty

  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.sortOrder !== undefined) dbUpdates.sort_order = updates.sortOrder;
  if (updates.available !== undefined) dbUpdates.available = updates.available ? 1 : 0;

  await db('menu_categories')
    .where({ id: categoryId, branch_id: branchId })
    .whereNull('deleted_at') // Safety
    .update(dbUpdates);
}

// 🗑️ Soft Delete
export async function deleteCategoryRepo(categoryId, branchId)
{
  // 🛑 STOP: No more .del()
  return db('menu_categories')
    .where({ id: categoryId, branch_id: branchId })
    .update({
      deleted_at: Date.now(), // ✅ SYNC
      updated_at: Date.now()
    });
}

/* ============================================================
   WRITE OPERATIONS (Batch)
============================================================ */

export async function insertCategoriesBatch(categories)
{
  await db('menu_categories').insert(
    categories.map(cat => ({
      id: cat.id,
      name: cat.name,
      sort_order: cat.sortOrder,
      available: cat.available ? 1 : 0,
      branch_id: cat.branchId,
      created_at: cat.createdAt,
      updated_at: cat.updatedAt,
      deleted_at: null // ✅ SYNC
    }))
  );
}

export async function updateCategoriesBatch({ targetBranchIds, name, updates })
{
  const dbUpdates = { updated_at: Date.now() };
  if (updates.name) dbUpdates.name = updates.name;
  if (updates.courseSequence !== undefined) dbUpdates.course_sequence = updates.courseSequence;
  if (updates.sortOrder !== undefined) dbUpdates.sort_order = updates.sortOrder;
  if (updates.available !== undefined) dbUpdates.available = updates.available ? 1 : 0;

  return await db('menu_categories')
    .whereIn('branch_id', targetBranchIds)
    .andWhereRaw('LOWER(name) = LOWER(?)', [name])
    .whereNull('deleted_at') // 🛡️ SYNC
    .update(dbUpdates);
}

// 🗑️ Batch Soft Delete
export async function deleteCategoriesBatch({ targetBranchIds, name })
{
  return await db('menu_categories')
    .whereIn('branch_id', targetBranchIds)
    .andWhereRaw('LOWER(name) = LOWER(?)', [name])
    .whereNull('deleted_at') // Safety: Don't update already deleted ones (optional but cleaner)
    .update({
      deleted_at: Date.now(), // ✅ SYNC
      updated_at: Date.now()
    });
}

/* ============================================================
   HELPER
============================================================ */

function mapRowToCategory(row)
{
  return {
    id: row.id,
    name: row.name,
    sortOrder: row.sort_order,
    available: row.available === 1,
    branchId: row.branch_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at
  };
}
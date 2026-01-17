// src/recipes/recipeRepository.js
import db from "../db.js";

/* ============================================================
   READ OPERATIONS
============================================================ */

export async function getRecipeByMenuItemId(menuItemId, branchId)
{
  const row = await db('recipes')
    .join('menu_items', 'recipes.menu_item_id', 'menu_items.id')
    .join('menu_categories', 'menu_items.category_id', 'menu_categories.id')
    .select('recipes.*')
    .where('recipes.menu_item_id', menuItemId)
    .andWhere('menu_categories.branch_id', branchId)
    .whereNull('recipes.deleted_at') // 🛡️ SYNC: Hide deleted recipes
    .first();

  return row ? mapRowToRecipe(row) : null;
}

export async function findRecipeIdsByItemName(itemName, branchIds)
{
  return db('recipes')
    .join('menu_items', 'recipes.menu_item_id', 'menu_items.id')
    .join('menu_categories', 'menu_items.category_id', 'menu_categories.id')
    .select('recipes.id', 'menu_items.name as item_name', 'menu_categories.branch_id')
    .whereIn('menu_categories.branch_id', branchIds)
    .whereNull('recipes.deleted_at') // 🛡️ SYNC
    .andWhereRaw('LOWER(menu_items.name) = LOWER(?)', [itemName]);
}

/* ============================================================
   WRITE OPERATIONS (Single)
============================================================ */

export async function insertRecipe(recipe)
{
  await db('recipes').insert({
    id: recipe.id,
    menu_item_id: recipe.menuItemId,
    instructions: recipe.instructions,
    created_at: recipe.createdAt,
    updated_at: recipe.updatedAt,
    deleted_at: null // ✅ SYNC: Explicitly active
  });
}

export async function updateRecipeInstructionsRepo(recipeId, instructions)
{
  await db('recipes')
    .where({ id: recipeId })
    .whereNull('deleted_at') // Safety: Don't edit ghosts
    .update({
      instructions: instructions,
      updated_at: Date.now() // ✅ SYNC: Mark as dirty
    });
}

// 🗑️ Soft Delete
export async function deleteRecipeRepo(recipeId)
{
  // 🛑 STOP: No more .del()
  await db('recipes')
    .where({ id: recipeId })
    .update({
      deleted_at: Date.now(), // ✅ SYNC: Soft Delete
      updated_at: Date.now()  // ✅ SYNC: Required for cloud sync!
    });
}

/* ============================================================
   WRITE OPERATIONS (Batch)
============================================================ */

export async function insertRecipesBatch(recipes)
{
  await db('recipes').insert(
    recipes.map(r => ({
      id: r.id,
      menu_item_id: r.menuItemId,
      instructions: r.instructions,
      created_at: r.createdAt,
      updated_at: r.updatedAt,
      deleted_at: null // ✅ SYNC
    }))
  );
}

export async function updateRecipeInstructionsBatch(recipeIds, newInstructions)
{
  await db('recipes')
    .whereIn('id', recipeIds)
    .whereNull('deleted_at')
    .update({
      instructions: newInstructions,
      updated_at: Date.now() // ✅ SYNC
    });
}

// 🗑️ Batch Soft Delete
export async function deleteRecipesByItemIds(itemIds)
{
  await db('recipes')
    .whereIn('menu_item_id', itemIds)
    .update({
      deleted_at: Date.now(), // ✅ SYNC
      updated_at: Date.now()
    });
}

/* ============================================================
   HELPER
============================================================ */
function mapRowToRecipe(row)
{
  return {
    id: row.id,
    menuItemId: row.menu_item_id,
    instructions: row.instructions,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at
  };
}
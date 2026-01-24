import db from "../db.js";

/* ============================================================
   READ OPERATIONS
============================================================ */

export async function getRecipeByMenuItemId(menuItemId, branchId)
{
  const query = db('recipes')
    .join('menu_items', 'recipes.menu_item_id', 'menu_items.id')
    .join('menu_categories', 'menu_items.category_id', 'menu_categories.id')
    .select(
      'recipes.*',
      'menu_categories.branch_id' // Useful for verification
    )
    .where('recipes.menu_item_id', menuItemId)
    .whereNull('recipes.deleted_at')
    .first();

  // 🛡️ SECURITY: Enforce branch check if provided (Manager Context)
  if (branchId)
  {
    query.andWhere('menu_categories.branch_id', branchId);
  }

  const row = await query;
  return row ? mapRowToRecipe(row) : null;
}

export async function findRecipeIdsByItemName(itemName, branchIds)
{
  return db('recipes')
    .join('menu_items', 'recipes.menu_item_id', 'menu_items.id')
    .join('menu_categories', 'menu_items.category_id', 'menu_categories.id')
    .select(
      'recipes.id',
      'menu_items.name as item_name',
      'menu_categories.branch_id' // 👈 Critical for Per-Branch Logging
    )
    .whereIn('menu_categories.branch_id', branchIds)
    .whereNull('recipes.deleted_at')
    .andWhereRaw('LOWER(TRIM(menu_items.name)) = LOWER(TRIM(?))', [itemName]);
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
    deleted_at: null
  });
}

export async function updateRecipeInstructionsRepo(recipeId, instructions)
{
  await db('recipes')
    .where({ id: recipeId })
    .whereNull('deleted_at')
    .update({
      instructions: instructions,
      updated_at: Date.now() // ✅ SYNC
    });
}

export async function deleteRecipeRepo(recipeId)
{
  await db('recipes')
    .where({ id: recipeId })
    .update({
      deleted_at: Date.now(),
      updated_at: Date.now()
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
      deleted_at: null
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
      updated_at: Date.now()
    });
}

// Used when deleting an Item (Cascade soft delete)
export async function deleteRecipesByItemIds(itemIds)
{
  await db('recipes')
    .whereIn('menu_item_id', itemIds)
    .update({
      deleted_at: Date.now(),
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
    branchId: row.branch_id, // Added for context
    instructions: row.instructions,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at
  };
}
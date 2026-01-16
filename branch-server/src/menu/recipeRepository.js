import db from "../db.js";

/* ============================================================
   READ OPERATIONS
============================================================ */

// 🔍 WHAT: Fetches a recipe for a specific menu item, ensuring it belongs to the correct branch.
// 🛡️ WHY:  Security. Since 'recipes' table doesn't have 'branch_id', we MUST join 
//          up through 'menu_items' -> 'menu_categories' to verify ownership.
export async function getRecipeByMenuItemId(menuItemId, branchId)
{
  const row = await db('recipes')
    .join('menu_items', 'recipes.menu_item_id', 'menu_items.id')
    .join('menu_categories', 'menu_items.category_id', 'menu_categories.id')
    .select('recipes.*')
    .where('recipes.menu_item_id', menuItemId)
    .andWhere('menu_categories.branch_id', branchId) // <--- Strict Security Check
    .first();

  return row ? mapRowToRecipe(row) : null;
}

// 🔍 WHAT: Finds Recipe IDs for items with a specific name across specific branches.
// 🛡️ WHY:  Enabler for "Batch Recipe Update". 
//          The Owner says: "Update 'Burger' recipe in Downtown and Uptown."
export async function findRecipeIdsByItemName(itemName, branchIds)
{
  return db('recipes')
    .join('menu_items', 'recipes.menu_item_id', 'menu_items.id')
    .join('menu_categories', 'menu_items.category_id', 'menu_categories.id')
    .select('recipes.id', 'menu_items.name as item_name')
    .whereIn('menu_categories.branch_id', branchIds)
    .andWhereRaw('LOWER(menu_items.name) = LOWER(?)', [itemName]);
}

/* ============================================================
   WRITE OPERATIONS (Single)
============================================================ */

// ✏️ WHAT: Inserts a new recipe.
export async function insertRecipe(recipe)
{
  await db('recipes').insert({
    id: recipe.id,
    menu_item_id: recipe.menuItemId,
    instructions: recipe.instructions,
    created_at: recipe.createdAt,
    updated_at: recipe.updatedAt
  });
}

// ✏️ WHAT: Updates instructions for one specific recipe.
export async function updateRecipeInstructionsRepo(recipeId, instructions)
{
  await db('recipes')
    .where({ id: recipeId })
    .update({
      instructions: instructions,
      updated_at: Date.now()
    });
}

// 🗑️ WHAT: Deletes a recipe manually.
// 🛡️ WHY:  Fallback if "ON DELETE CASCADE" is missing or if you want to clear a recipe without deleting the item.
export async function deleteRecipeRepo(recipeId)
{
  await db('recipes')
    .where({ id: recipeId })
    .del();
}

/* ============================================================
   WRITE OPERATIONS (Batch)
============================================================ */

// 🚀 WHAT: Inserts multiple recipes in ONE database call.
// 🛡️ WHY:  Critical for "Batch Create Item". When adding "Burger" to 50 branches, 
//          we use this to insert 50 recipes instantly.
export async function insertRecipesBatch(recipes)
{
  await db('recipes').insert(
    recipes.map(r => ({
      id: r.id,
      menu_item_id: r.menuItemId,
      instructions: r.instructions,
      created_at: r.createdAt,
      updated_at: r.updatedAt
    }))
  );
}

// 🚀 WHAT: Updates instructions for MULTIPLE recipes at once.
// 🛡️ WHY:  Performance. Used when pushing a "Standard Recipe" to all branches.
export async function updateRecipeInstructionsBatch(recipeIds, newInstructions)
{
  await db('recipes')
    .whereIn('id', recipeIds)
    .update({
      instructions: newInstructions,
      updated_at: Date.now()
    });
}

// 🗑️ WHAT: Deletes recipes for specific Item IDs.
// 🛡️ WHY:  Used if we want to "Clear Recipes" from a list of items without deleting the items themselves.
export async function deleteRecipesByItemIds(itemIds)
{
  await db('recipes')
    .whereIn('menu_item_id', itemIds)
    .del();
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
    updatedAt: row.updated_at
  };
}